import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireUser } from '../middlewares/requireUser.js';
import { z } from 'zod';
import multer from 'multer';
import crypto from 'crypto';
import { ed } from '../crypto/ed25519.js'; 
import { sendEmail } from '../email/mailer.js';
import { putPdfObject } from '../storage/s3.js';

export const user = Router();
user.use(requireUser);

// Get current user profile info + related documents
user.get('/me', async (req, res, next) => {
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
    console.log('User profile:', me);

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
    console.log('Documents found:', documents);

    const result = documents.map(d => {
      const totalRequired = d.participants.filter(p => p.required).length;
      const totalSigned   = d.signatures.length;
      const myRole =
        d.ownerId === id ? 'OWNER'
        : d.participants.some(p => p.userId === id) ? 'PARTICIPANT'
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
        participants: d.participants.map(p => ({
          user: p.user, required: p.required, decision: p.decision, decidedAt: p.decidedAt
        })),
        signatures: d.signatures.map(s => ({
          user: s.user, alg: s.alg, signedAt: s.signedAt
        })),
      };
    });

    res.json({ user: me, documents: result });
  } catch (e) { next(e); }
});


// Documents
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 25 MB cap

type CanonicalInput = {
  sha256Hex: string;
  title: string;
  participants: Array< string >;
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

// Create document
user.post('/documents', upload.single('file'), async (req, res, next) => {
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
        participants: users.map(u => ( u.username! )),
      });

      const ok = await ed.verifyAsync(
        Buffer.from(body.creatorSignatureB64, 'base64'),
        Buffer.from(canonical, 'utf8'),
        Buffer.from(creator.publicKeyEd25519, 'hex')
      );
      if (!ok) return res.status(400).json({ error: 'Invalid creator signature' });

      const docId = crypto.randomUUID();
      const s3Key = `documents/${docId}.pdf`;
      await putPdfObject(s3Key, req.file!.buffer, body.sha256Hex);

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
              data: users.map((u, i) => ({
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

      // Email participants (except creator) with PDF attached
      const recipients = doc.participants
        .filter(p => p.userId !== me.id)
        .map(p => p.user.email)
        .filter(Boolean) as string[];
      
      console.log('Emailing participants:', recipients);

      if (recipients.length) {
        await sendEmail(
          recipients.join(','),
          `Document to review & sign: ${doc.title}`,
          `<p>You have a new document to review and sign: <b>${doc.title}</b>.</p>
           <p>Verify its SHA-256 hash matches the payload shown in the app before signing.</p>`,
          { attachments: [{ filename: `${doc.title}.pdf`, content: req.file.buffer, contentType: 'application/pdf' }] }
        );
      }

      return res.json({ documentId: doc.id, status: doc.status, createdAt: doc.createdAt });
    } catch (e) { next(e); }
  }
);

// Participant signs
user.post('/documents/:docId/sign', async (req, res, next) => {
  try {
    console.log('User', (req as any).user);
    const { id } = (req as any).user as { id: string };
    const { docId } = z.object({ docId: z.string() }).parse(req.params);
    const { signatureB64 } = z.object({ signatureB64: z.string() }).parse(req.body);

    console.log(`User ${id} signing document ${docId}`);

    const doc = await prisma.document.findUnique({
      where: { id: docId },
      include: { participants: true, signatures: true, owner: { select: { email: true } } }
    });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.status !== 'PENDING') return res.status(400).json({ error: 'Not pending' });

    const isParticipant = doc.participants.some(p => p.userId === id);
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });

    const already = doc.signatures.some(s => s.userId === id);
    if (already) return res.status(400).json({ error: 'Already signed' });

    const me = await prisma.user.findUnique({ where: { id: id } });
    if (!me?.publicKeyEd25519) return res.status(400).json({ error: 'Public key missing' });

    const ok = await ed.verifyAsync(
      Buffer.from(signatureB64, 'base64'),
      Buffer.from(doc.canonicalPayload, 'utf8'),
      Buffer.from(me.publicKeyEd25519, 'hex')
    );
    if (!ok) return res.status(400).json({ error: 'Invalid signature' });

    await prisma.signature.create({
      data: { documentId: docId, userId: id, alg: 'Ed25519', signatureB64 }
    });

    const required = doc.participants.filter(p => p.required).length;
    const signed   = doc.signatures.length + 1;

    if (signed >= required) {
      const updated = await prisma.document.update({
        where: { id: docId },
        data: { status: 'SIGNED' },
        include: {
          owner: { select: { email: true } },
          participants: { include: { user: { select: { email: true } } } }
        }
      });

      const recipients = [
        updated.owner?.email,
        ...updated.participants.map(p => p.user.email)
      ].filter(Boolean) as string[];

      if (recipients.length) {
        await sendEmail(
          recipients.join(','),
          `All parties signed: ${updated.title}`,
          `<p>Your document <b>${updated.title}</b> is fully signed.</p>
           <p>You can verify at any time by re-hashing the PDF and checking in the app.</p>`
        );
      }
      return res.json({ status: 'SIGNED' });
    }

    res.json({ status: 'PENDING' });
  } catch (e) { next(e); }
});

// Internal verification of the document by uploading a PDF 
// TODO: make also one for anyone, no auth required
user.post('/documents/verify',
  upload.single('file'),
  async (req, res, next) => {
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
          participants: d.participants.map(p => ({ user: p.user, required: p.required })),
          signatures: d.signatures
            .sort((a, b) => a.signedAt.getTime() - b.signedAt.getTime())
            .map(s => ({
              user: s.user,
              alg: s.alg,
              signedAt: s.signedAt
            })),
        }
      });
    } catch (e) { next(e); }
  }
);