import cron from 'node-cron';
import { prisma } from '../prisma.js';

const runCleanup = async () => {
    console.log('Running cleanup job...');
    try {
        const now = new Date();

        const deletedChallenges = await prisma.loginChallenge.deleteMany({
            where: {
                expiresAt: {
                    lt: now,
                },
            },
        });

        const deletedTokens = await prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {
                    lt: now,
                },
            },
        });

        console.log(`Cleanup complete. Deleted ${deletedChallenges.count} challenges and ${deletedTokens.count} refresh tokens.`);
    } catch (error) {
        console.error('Error running cleanup job:', error);
    }
};

export const startCleanupJob = () => {
    runCleanup();
    // Run every hour at minute 0
    cron.schedule('0 * * * *', runCleanup);
    console.log('Cleanup job scheduled (runs every hour).');
};
