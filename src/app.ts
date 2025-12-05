import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import pinoHttpDefault from 'pino-http';
import { env } from './env.js';
import { auth } from './routes/auth.routes.js';

import { registration } from './routes/registration.routes.js';
import { admin } from './routes/admin.routes.js';
import { user, publicDocuments } from './routes/user.routes.js';
import { blockchain } from './routes/blockchain.routes.js';

import { requireAuth } from './middlewares/requireAuth.js';
import { errorHandler } from './middlewares/error.js';

const app = express();
const logger = pino({ transport: { target: 'pino-pretty' } });
const pinoHttp = (pinoHttpDefault as unknown as (opts?: any) => any);

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', auth);
app.use('/api/v1/registration', registration);
app.use('/api/v1/documents', publicDocuments);
app.use('/api/v1/admin', requireAuth, admin);
app.use('/api/v1/admin/blockchain', requireAuth, blockchain);
app.use('/api/v1/user', requireAuth, user);

app.use(errorHandler);

export { app };
