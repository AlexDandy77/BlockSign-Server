import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import pinoHttpDefault from 'pino-http';
import { env } from './env.js';
import { login } from './routes/auth.routes.js';
import { registration } from './routes/registration.routes.js';
import { adminReg } from './routes/admin.registration.routes.js';
import { requireAuth } from './middlewares/auth.js';
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
app.use('/api/v1/auth', login);
app.use('/api/v1/registration', registration);
app.use('/api/v1/admin', requireAuth, adminReg); // requireAuth sets req.user


// errors
app.use(errorHandler);

export { app };
