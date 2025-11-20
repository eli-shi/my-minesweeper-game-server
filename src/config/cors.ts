import { CorsOptions } from 'cors';

const getAllowedOrigins = (): string[] | string => {
    const origins = process.env.CORS_ORIGINS;

    if (!origins) {
        return process.env.NODE_ENV === 'production' ? [] : '*';
    }

    if (origins === '*') {
        return '*';
    }

    return origins.split(',').map(origin => origin.trim());
};

export const corsOptions: CorsOptions = {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
};

