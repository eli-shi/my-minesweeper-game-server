import { CorsOptions } from 'cors';

// Get allowed origins from environment variable
// Can be a comma-separated list of origins, or '*' for all origins (development only)
const getAllowedOrigins = (): string[] | string => {
    const origins = process.env.CORS_ORIGINS;

    if (!origins) {
        // Default to allowing all origins in development
        // In production, you should set CORS_ORIGINS explicitly
        return process.env.NODE_ENV === 'production' ? [] : '*';
    }

    if (origins === '*') {
        return '*';
    }

    // Split comma-separated origins and trim whitespace
    return origins.split(',').map(origin => origin.trim());
};

export const corsOptions: CorsOptions = {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Allow cookies and authorization headers
    maxAge: 86400, // Cache preflight requests for 24 hours
};

