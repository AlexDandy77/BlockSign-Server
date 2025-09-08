import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import pinoHttpDefault from 'pino-http';
import { env } from './env.js';
import { auth } from './routes/auth.routes.js';
import { errorHandler } from './middlewares/error.js';

const app = express();
const logger = pino({ transport: { target: 'pino-pretty' }});
const pinoHttp = (pinoHttpDefault as unknown as (opts?: any) => any);


app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// routes
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', auth);

// errors
app.use(errorHandler);

export { app };
