import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { getPolygonAnchor } from '../blockchain/polygon.js';
import { prisma } from '../prisma.js';

export const blockchain = Router();
blockchain.use(requireAdmin);

// Get company wallet info
blockchain.get('/wallet/info', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const polygonAnchor = getPolygonAnchor();
        const address = polygonAnchor.getAddress();
        const balance = await polygonAnchor.getBalance();

        const totalAnchored = await prisma.document.count({
            where: { blockchainTxId: { not: null } }
        });

        res.json({
            address,
            balance: `${balance} MATIC`,
            totalAnchored,
            network: 'Polygon',
            explorerBase: process.env.BLOCKCHAIN_EXPLORER_BASE
        });
    } catch (e) {
        next(e);
    }
});

// Get all blockchain-anchored documents
blockchain.get('/documents', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const docs = await prisma.document.findMany({
            where: { blockchainTxId: { not: null } },
            orderBy: { anchoredAt: 'desc' },
            select: {
                id: true,
                title: true,
                sha256Hex: true,
                blockchainTxId: true,
                blockchainNetwork: true,
                anchoredAt: true,
                explorerUrl: true,
                status: true,
                owner: { select: { fullName: true, username: true } }
            },
            take: 100
        });

        res.json({ documents: docs, total: docs.length });
    } catch (e) {
        next(e);
    }
});

// Get blockchain anchor stats
blockchain.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const totalDocuments = await prisma.document.count();
        const totalSigned = await prisma.document.count({
            where: { status: 'SIGNED' }
        });
        const totalAnchored = await prisma.document.count({
            where: { blockchainTxId: { not: null } }
        });

        const anchorRate = totalSigned > 0 ? ((totalAnchored / totalSigned) * 100).toFixed(2) : '0.00';

        res.json({
            totalDocuments,
            totalSigned,
            totalAnchored,
            anchorSuccessRate: `${anchorRate}%`,
            pendingAnchoring: totalSigned - totalAnchored
        });
    } catch (e) {
        next(e);
    }
});

// Verify a specific transaction on blockchain
blockchain.get('/verify/:txId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { txId } = req.params as { txId: string };
        const polygonAnchor = getPolygonAnchor();

        const verification = await polygonAnchor.verifyTransaction(txId);

        // Also get document info from DB
        const doc = await prisma.document.findUnique({
            where: { blockchainTxId: txId },
            select: {
                id: true,
                title: true,
                sha256Hex: true,
                owner: { select: { fullName: true, username: true } }
            }
        });

        res.json({
            transaction: verification,
            document: doc
        });
    } catch (e) {
        next(e);
    }
});

// Retry failed anchoring for a document (if it didn't get anchored)
blockchain.post('/documents/:docId/retry-anchor', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { docId } = req.params as { docId: string };

        const doc = await prisma.document.findUnique({
            where: { id: docId },
            include: {
                owner: { select: { username: true } },
                participants: { include: { user: { select: { username: true } } } }
            }
        });

        if (!doc) return res.status(404).json({ error: 'Not found' });
        if (doc.status !== 'SIGNED') {
            return res.status(400).json({ error: 'Document must be fully signed' });
        }
        if (doc.blockchainTxId) {
            return res.status(400).json({ error: 'Already anchored' });
        }

        const participantUsernames = doc.participants.map((p: any) => p.user.username);
        const ownerUsername = doc.owner.username;
        const polygonAnchor = getPolygonAnchor();

        const anchorResult = await polygonAnchor.anchorDocument({
            documentId: doc.id,
            sha256Hex: doc.sha256Hex,
            title: doc.title,
            ownerUsername,
            participantUsernames,
            canonicalPayload: doc.canonicalPayload
        });

        await prisma.document.update({
            where: { id: docId },
            data: {
                blockchainTxId: anchorResult.txId,
                blockchainNetwork: anchorResult.network,
                anchoredAt: new Date(),
                explorerUrl: anchorResult.explorerUrl
            }
        });

        res.json({
            success: true,
            blockchain: anchorResult
        });
    } catch (e) {
        next(e);
    }
});
