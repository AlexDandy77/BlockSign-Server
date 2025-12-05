import 'dotenv/config';

const required = (k: string) => {
    const v = process.env[k];
    if (!v) throw new Error(`Missing env var: ${k}`);
    return v;
};

export const env = {
    PORT: Number(process.env.PORT ?? 4000),
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
    JWT_SECRET: required('JWT_SECRET'),
    JWT_ACCESS_TTL: Number(process.env.JWT_ACCESS_TTL ?? 900),
    JWT_REFRESH_TTL: Number(process.env.JWT_REFRESH_TTL ?? 604800),
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    DATABASE_URL: required('DATABASE_URL'),
    BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL ?? 'https://polygon-rpc.com',
    COMPANY_WALLET_ADDRESS: process.env.COMPANY_WALLET_ADDRESS ?? '',
    COMPANY_WALLET_PRIVATE_KEY: process.env.COMPANY_WALLET_PRIVATE_KEY ?? '',
    BLOCKCHAIN_EXPLORER_BASE: process.env.BLOCKCHAIN_EXPLORER_BASE ?? 'https://polygonscan.com'
};
