import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { requireUser } from '../middlewares/requireUser.js';
import { z } from 'zod';
import multer from 'multer';
import crypto from 'crypto';
import { ed } from '../crypto/ed25519.js';
import { sendEmail, documentReviewSignTemplate, documentSignedTemplate, documentRejectedTemplate } from '../email/mailer.js';
import { putPdfObject, getPresignedGetUrl, streamObject, deleteObject, moveDocumentToSignedBucket, getBucketForStatus } from '../storage/s3.js';
import { getPolygonAnchor } from '../blockchain/polygon.js';
import { documentLimiter } from '../middlewares/rateLimit.js';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export const user = Router();
user.use(requireUser);

// Public router for document verification (no auth required)
export const publicDocuments = Router();

// Get current user profile info + related documents
user.get('/me', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = (req as any).user as { id: string };

        const me = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true, email: true, fullName: true, username: true,
                role: true, status: true, createdAt: true, updatedAt: true
            }
        });
        if (!me) return res.status(404).json({ error: 'User not found' });

        const documents = await prisma.document.findMany({
            where: {
                OR: [
                    { ownerId: id },
                    { participants: { some: { userId: id } } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                owner: { select: { id: true, fullName: true, username: true, email: true } },
                participants: {
                    include: { user: { select: { id: true, fullName: true, username: true, email: true } } }
                },
                signatures: {
                    orderBy: { signedAt: 'asc' },
                    include: { user: { select: { id: true, fullName: true, username: true } } }
                },
            }
        });

        const result = documents.map((d: any) => {
            const totalRequired = d.participants.filter((p: any) => p.required).length;
            const totalSigned = d.signatures.length;
            const myRole =
                d.ownerId === id ? 'OWNER'
                    : d.participants.some((p: any) => p.userId === id) ? 'PARTICIPANT'
                        : 'VIEWER';

            return {
                id: d.id,
                title: d.title,
                status: d.status,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
                mimeType: d.mimeType,
                sizeBytes: d.sizeBytes,
                myRole,
                progress: { totalRequired, totalSigned },
                owner: d.owner,
                participants: d.participants.map((p: any) => ({
                    user: p.user, required: p.required, decision: p.decision, decidedAt: p.decidedAt
                })),
                signatures: d.signatures.map((s: any) => ({
                    user: s.user, alg: s.alg, signedAt: s.signedAt
                })),
            };
        });

        res.json({ user: me, documents: result });
    } catch (e) { next(e); }
});


// Documents
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB cap

type CanonicalInput = {
    sha256Hex: string;
    title: string;
    participants: Array<string>;
};

// Helper - everyone signs the exact same JSON
function buildCanonicalPayload(input: CanonicalInput) {
    const sorted = [...input.participants].sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' })
    );
    const obj = {
        sha256Hex: input.sha256Hex.toLowerCase(),
        docTitle: input.title,
        participantsUsernames: sorted,
    };

    return JSON.stringify(obj);
}

function sha256Hex(buf: Buffer | Uint8Array) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function escapeHtml(input: string) {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

// Create document
user.post('/documents', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const participantsUsernames =
            Array.isArray(req.body.participantsUsernames)
                ? req.body.participantsUsernames
                : JSON.parse(req.body.participantsUsernames || '[]');

        const createdAtIso = new Date().toISOString();

        const me = (req as any).user as { id: string };

        const body = z.object({
            sha256Hex: z.string().length(64).regex(/^[0-9a-f]+$/),
            docTitle: z.string().min(1).max(200),
            participantsUsernames: z.array(z.string().min(3)).min(1),
            creatorSignatureB64: z.string(),
        }).parse({
            ...req.body,
            participantsUsernames
        });

        if (!req.file) return res.status(400).json({ error: 'PDF file is required' });
        if (req.file.mimetype !== 'application/pdf')
            return res.status(400).json({ error: 'Only PDF is allowed' });

        const fileHash = sha256Hex(req.file.buffer);
        if (fileHash !== body.sha256Hex.toLowerCase()) {
            return res.status(400).json({ error: 'File hash mismatch' });
        }

        // Reject if a document with the same hash already exists
        const existing = await prisma.document.findFirst({ where: { sha256Hex: body.sha256Hex.toLowerCase() } });
        if (existing) {
            return res.status(409).json({ error: 'A document with this hash already exists', documentId: existing.id });
        }

        const users = await prisma.user.findMany({
            where: { username: { in: body.participantsUsernames } },
            select: { id: true, username: true, email: true }
        });
        if (users.length !== body.participantsUsernames.length) {
            return res.status(400).json({ error: 'Some usernames not found' });
        }

        const creator = await prisma.user.findUnique({ where: { id: me.id } });
        if (!creator?.publicKeyEd25519) {
            return res.status(400).json({ error: 'Creator public key missing' });
        }

        const canonical = buildCanonicalPayload({
            sha256Hex: body.sha256Hex,
            title: body.docTitle,
            participants: users.map((u: any) => (u.username!)),
        });

        const ok = await ed.verifyAsync(
            Buffer.from(body.creatorSignatureB64, 'base64'),
            Buffer.from(canonical, 'utf8'),
            Buffer.from(creator.publicKeyEd25519, 'hex')
        );
        if (!ok) return res.status(400).json({ error: 'Invalid creator signature' });

        const docId = crypto.randomUUID();
        const s3Key = `documents/${docId}.pdf`;

        const doc = await prisma.document.create({
            data: {
                id: docId,
                ownerId: me.id,
                title: body.docTitle,
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
                sha256Hex: body.sha256Hex.toLowerCase(),
                status: 'PENDING',
                canonicalPayload: canonical,
                storageKey: s3Key,
                createdAt: createdAtIso,
                participants: {
                    createMany: {
                        data: users.map((u: any, i: any) => ({
                            userId: u.id, orderIndex: i, required: true
                        }))
                    }
                },
                signatures: {
                    create: {
                        userId: me.id,
                        alg: 'Ed25519',
                        signatureB64: body.creatorSignatureB64
                    }
                }
            },
            include: { participants: { include: { user: { select: { email: true, username: true } } } } }
        });

        await putPdfObject(s3Key, req.file!.buffer, body.sha256Hex);

        // Email participants (except creator) with PDF attached
        const recipients = doc.participants
            .filter((p: any) => p.userId !== me.id)
            .map((p: any) => p.user.email)
            .filter(Boolean) as string[];

        if (recipients.length) {
            await sendEmail(
                recipients.join(','),
                `Document to review & sign: ${doc.title}`,
                documentReviewSignTemplate(doc.title, APP_URL)
            );
        }

        return res.json({ documentId: doc.id, status: doc.status, createdAt: doc.createdAt });
    } catch (e) { next(e); }
}
);

// View document in browser (opens PDF in new tab)
user.get('/documents/:id/view', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: userId } = (req as any).user as { id: string };
        const { id: documentId } = req.params as { id: string };

        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            select: {
                title: true,
                ownerId: true,
                storageKey: true,
                status: true,
                participants: { select: { userId: true } }
            }
        });
        if (!doc) return res.status(404).json({ error: 'Not found' });

        const isOwner = doc.ownerId === userId;
        const isParticipant = doc.participants.some((p: any) => p.userId === userId);
        if (!isOwner && !isParticipant) return res.status(403).json({ error: 'Forbidden' });

        if (!doc.storageKey) return res.status(409).json({ error: 'File not available' });

        const bucket = getBucketForStatus(doc.status);
        const s3Object = await streamObject(doc.storageKey, bucket);
        
        const filename = doc.title ? `${doc.title}.pdf` : 'document.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        if (s3Object.ContentLength) {
            res.setHeader('Content-Length', s3Object.ContentLength.toString());
        }
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`); // inline = view
        res.setHeader('Cache-Control', 'private, max-age=600');

        const body = s3Object.Body as any;
        if (body && typeof body.pipe === 'function') {
            body.pipe(res).on('error', next);
        } else {
            return res.status(500).json({ error: 'Failed to stream file' });
        }
    } catch (e) { next(e); }
});

// Returns a 10-minute presigned GET link (legacy)
user.get('/documents/:id/url', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: userId } = (req as any).user as { id: string };
        const { id: documentId } = req.params as { id: string };

        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                ownerId: true,
                storageKey: true,
                status: true,
                participants: { select: { userId: true } }
            }
        });
        if (!doc) return res.status(404).json({ error: 'Not found' });

        const isOwner = doc.ownerId === userId;
        const isParticipant = doc.participants.some((p: any) => p.userId === userId);
        if (!isOwner && !isParticipant) return res.status(403).json({ error: 'Forbidden' });

        if (!doc.storageKey) return res.status(409).json({ error: 'File not available' });

        const bucket = getBucketForStatus(doc.status);
        const url = await getPresignedGetUrl(doc.storageKey, bucket, 10 * 60);
        res.json({ url, expiresIn: 600 });
    } catch (e) { next(e); }
});

// Participant signs
user.post('/documents/:docId/sign', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = (req as any).user as { id: string };
        const { docId } = z.object({ docId: z.string() }).parse(req.params);
        const { signatureB64 } = z.object({ signatureB64: z.string() }).parse(req.body);

        const doc = await prisma.document.findUnique({
            where: { id: docId },
            include: { participants: true, signatures: true, owner: { select: { email: true } } }
        });
        if (!doc) return res.status(404).json({ error: 'Not found' });
        if (doc.status !== 'PENDING') return res.status(400).json({ error: 'Not pending' });

        const isParticipant = doc.participants.some((p: any) => p.userId === id);
        if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });

        const already = doc.signatures.some((s: any) => s.userId === id);
        if (already) return res.status(400).json({ error: 'Already signed' });

        const me = await prisma.user.findUnique({ where: { id: id } });
        if (!me?.publicKeyEd25519) return res.status(400).json({ error: 'Public key missing' });

        const ok = await ed.verifyAsync(
            Buffer.from(signatureB64, 'base64'),
            Buffer.from(doc.canonicalPayload, 'utf8'),
            Buffer.from(me.publicKeyEd25519, 'hex')
        );
        if (!ok) return res.status(400).json({ error: 'Invalid signature' });

        const participant = doc.participants.find((p: any) => p.userId === id);
        if (!participant) return res.status(403).json({ error: 'Participant record not found' });

        // Update participant decision
        await prisma.documentParticipant.update({
            where: { id: participant.id },
            data: {
                decision: 'SIGNED',
                decidedAt: new Date()
            }
        });

        await prisma.signature.create({
            data: { documentId: docId, userId: id, alg: 'Ed25519', signatureB64 }
        });

        const required = doc.participants.filter((p: any) => p.required).length;
        const signed = doc.signatures.length + 1;

        if (signed > required) {
            const updated = await prisma.document.update({
                where: { id: docId },
                data: { status: 'SIGNED' },
                include: {
                    owner: { select: { email: true, username: true } },
                    participants: { include: { user: { select: { email: true, username: true } } } }
                }
            });

            // Move document to signed bucket (with 10-day lifecycle)
            try {
                if (updated.storageKey) {
                    await moveDocumentToSignedBucket(updated.storageKey);
                    console.log(`Document ${docId} moved to signed bucket with 10-day lifecycle`);
                }
            } catch (s3Error) {
                console.error('Failed to move document to signed bucket:', s3Error);
                // Don't fail the signing process if S3 move fails
            }

            let blockchainInfo: any = null;

            // Anchor to Polygon blockchain
            try {
                const polygonAnchor = getPolygonAnchor();
                const participantUsernames = updated.participants.map((p: any) => p.user.username);

                const anchorResult = await polygonAnchor.anchorDocument({
                    documentId: updated.id,
                    sha256Hex: updated.sha256Hex,
                    title: updated.title,
                    ownerUsername: updated.owner.username,
                    participantUsernames,
                    canonicalPayload: updated.canonicalPayload
                });

                // Update document with blockchain info
                await prisma.document.update({
                    where: { id: docId },
                    data: {
                        blockchainTxId: anchorResult.txId,
                        blockchainNetwork: anchorResult.network,
                        anchoredAt: new Date(),
                        explorerUrl: anchorResult.explorerUrl
                    }
                });

                blockchainInfo = {
                    txId: anchorResult.txId,
                    explorerUrl: anchorResult.explorerUrl,
                    network: anchorResult.network
                };

                console.log(`Document ${docId} anchored to Polygon: ${anchorResult.txId}`);
            } catch (blockchainError) {
                console.error('Failed to anchor to blockchain:', blockchainError);
                // Don't fail the signing process if blockchain anchoring fails
                // Could implement retry logic later
            }

            const recipients = [
                updated.owner?.email,
                ...updated.participants.map((p: any) => p.user.email)
            ].filter(Boolean) as string[];

            if (recipients.length) {
                await sendEmail(
                    recipients.join(','),
                    `All parties signed: ${updated.title}`,
                    documentSignedTemplate(
                        updated.title,
                        APP_URL,
                        blockchainInfo ? {
                            txId: blockchainInfo.txId,
                            explorerUrl: blockchainInfo.explorerUrl
                        } : undefined
                    )
                );
            }

            return res.json({
                status: 'SIGNED',
                blockchain: blockchainInfo
            });
        }

        res.json({ status: 'PENDING' });
    } catch (e) { next(e); }
});

// Participant rejects document (delete from DB and S3)
user.post('/documents/:docId/reject', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = (req as any).user as { id: string };
        const { docId } = z.object({ docId: z.string() }).parse(req.params);
        const { reason } = z.object({ reason: z.string().optional() }).parse(req.body || {});

        const doc = await prisma.document.findUnique({
            where: { id: docId },
            include: {
                participants: { include: { user: { select: { email: true, fullName: true } } } },
                owner: { select: { email: true, fullName: true } },
            }
        });
        if (!doc) return res.status(404).json({ error: 'Not found' });
        if (doc.status !== 'PENDING') return res.status(400).json({ error: 'Document is not pending' });

        const participant = doc.participants.find((p: any) => p.userId === id);
        if (!participant) return res.status(403).json({ error: 'Not a participant' });

        // Delete document (cascades participants/signatures) and capture data for notifications
        const deleted = await prisma.document.delete({
            where: { id: docId },
            include: {
                owner: { select: { email: true, fullName: true } },
                participants: { include: { user: { select: { email: true, fullName: true } } } }
            }
        });

        // Best-effort delete from S3 (use correct bucket based on status)
        if (deleted.storageKey) {
            const bucket = getBucketForStatus(deleted.status);
            deleteObject(deleted.storageKey, bucket).catch((err) => {
                console.error('Failed to delete S3 object for rejected document', err);
            });
        }

        // Notify owner and all participants
        const recipients = [
            deleted.owner?.email,
            ...deleted.participants.map((p: any) => p.user.email)
        ].filter(Boolean) as string[];

        if (recipients.length) {
            const rejecter = deleted.participants.find((p: any) => p.userId === id);
            const sanitizedReason = reason ? escapeHtml(reason) : '';
            await sendEmail(
                recipients.join(','),
                `Document rejected: ${deleted.title}`,
                documentRejectedTemplate(
                    deleted.title,
                    APP_URL,
                    rejecter?.user.fullName || undefined,
                    sanitizedReason || undefined
                )
            );
        }

        res.json({ status: 'DELETED' });
    } catch (e) { next(e); }
});

// Public verification of documents by uploading a PDF (no authentication required)
publicDocuments.post('/verify', documentLimiter,
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'PDF file is required' });
            const fileHash = sha256Hex(req.file.buffer);

            const docs = await prisma.document.findMany({
                where: { sha256Hex: fileHash.toLowerCase(), status: 'SIGNED' },
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: { select: { id: true, email: true, fullName: true, username: true } },
                    participants: {
                        include: { user: { select: { id: true, email: true, fullName: true, username: true } } }
                    },
                    signatures: { include: { user: { select: { id: true, username: true, fullName: true } } } }
                }
            });

            if (!docs.length) {
                return res.json({ match: false, sha256Hex: fileHash });
            }

            // Return the latest match
            const d = docs[0];

            if (!d) {
                return res.json({ match: false, sha256Hex: fileHash });
            }
            res.json({
                match: true,
                sha256Hex: fileHash,
                document: {
                    id: d.id,
                    title: d.title,
                    createdAt: d.createdAt,
                    status: d.status,
                    owner: d.owner,
                    participants: d.participants.map((p: any) => ({ user: p.user, required: p.required })),
                    signatures: d.signatures
                        .sort((a: any, b: any) => a.signedAt.getTime() - b.signedAt.getTime())
                        .map((s: any) => ({
                            user: s.user,
                            alg: s.alg,
                            signedAt: s.signedAt
                        })),
                    // Blockchain info
                    blockchain: d.blockchainTxId ? {
                        txId: d.blockchainTxId,
                        network: d.blockchainNetwork,
                        anchoredAt: d.anchoredAt,
                        explorerUrl: d.explorerUrl
                    } : null
                }
            });
        } catch (e) { next(e); }
    }
);

// Get blockchain verification info for a document
user.get('/documents/:docId/blockchain', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: userId } = (req as any).user as { id: string };
        const { docId } = req.params as { docId: string };

        const doc = await prisma.document.findUnique({
            where: { id: docId },
            select: {
                id: true,
                ownerId: true,
                title: true,
                sha256Hex: true,
                blockchainTxId: true,
                blockchainNetwork: true,
                anchoredAt: true,
                explorerUrl: true,
                participants: { select: { userId: true } }
            }
        });

        if (!doc) return res.status(404).json({ error: 'Not found' });

        const isOwner = doc.ownerId === userId;
        const isParticipant = doc.participants.some((p: any) => p.userId === userId);
        if (!isOwner && !isParticipant) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (!doc.blockchainTxId) {
            return res.json({
                anchored: false,
                message: 'Document not yet anchored to blockchain'
            });
        }

        // Verify transaction on blockchain
        try {
            const polygonAnchor = getPolygonAnchor();
            const verification = await polygonAnchor.verifyTransaction(doc.blockchainTxId);

            res.json({
                anchored: true,
                transaction: {
                    txId: doc.blockchainTxId,
                    network: doc.blockchainNetwork,
                    anchoredAt: doc.anchoredAt,
                    explorerUrl: doc.explorerUrl,
                    blockNumber: verification.blockNumber,
                    confirmed: verification.confirmed,
                    metadata: verification.metadata
                }
            });
        } catch (verifyError) {
            // Return what we have in DB even if verification fails
            res.json({
                anchored: true,
                transaction: {
                    txId: doc.blockchainTxId,
                    network: doc.blockchainNetwork,
                    anchoredAt: doc.anchoredAt,
                    explorerUrl: doc.explorerUrl
                },
                verificationError: 'Could not verify transaction on blockchain'
            });
        }
    } catch (e) { next(e); }
});