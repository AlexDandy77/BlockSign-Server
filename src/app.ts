import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import pinoHttpDefault from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { auth } from './routes/auth.routes.js';

import { registration } from './routes/registration.routes.js';
import { admin } from './routes/admin.routes.js';
import { user, publicDocuments } from './routes/user.routes.js';
import { blockchain } from './routes/blockchain.routes.js';

import { requireAuth } from './middlewares/requireAuth.js';
import { errorHandler } from './middlewares/error.js';
import { generalLimiter } from './middlewares/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const logger = pino({ transport: { target: 'pino-pretty' } });
const pinoHttp = (pinoHttpDefault as unknown as (opts?: any) => any);

// Load OpenAPI spec
const openapiSpec = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));

app.use(pinoHttp({ logger }));
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            connectSrc: ["'self'", env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN].filter(Boolean),
        },
    },
}));
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'BlockSign API Documentation'
}));
app.get('/api-docs.json', (_req, res) => res.json(openapiSpec));

app.get('/api/v1/health', generalLimiter, (_req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', auth);
app.use('/api/v1/registration', registration);
app.use('/api/v1/documents', publicDocuments);
app.use('/api/v1/admin', requireAuth, admin);
app.use('/api/v1/admin/blockchain', requireAuth, blockchain);
app.use('/api/v1/user', requireAuth, user);

app.use(errorHandler);

export { app };
