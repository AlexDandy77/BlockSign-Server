import rateLimit from 'express-rate-limit';

// Auth endpoints - strict (brute force protection)
export const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false
});

// Registration endpoints - moderate (prevent spam)
export const registrationLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false
});

// Document operations - moderate (prevent abuse)
export const documentLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false
});

// General purpose - lenient
export const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});
