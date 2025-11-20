import { Request, Response, NextFunction } from 'express';
import '../config/firebase.js';
import { getAuth } from 'firebase-admin/auth';
import * as Sentry from '@sentry/node';

const auth = getAuth();

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header provided' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : authHeader;

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    if (token.length < 100) {
        return res.status(403).json({
            error: 'Invalid token format. Expected Firebase ID token (JWT), but received a short string. Make sure you are sending the Firebase ID token, not the user ID.'
        });
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return res.status(403).json({
            error: 'Invalid token format. JWT tokens should have 3 parts separated by dots. Make sure you are sending the complete Firebase ID token.'
        });
    }

    try {
        const decodedToken = await auth.verifyIdToken(token, true);
        req.user = decodedToken;
        next();
    } catch (error: any) {
        Sentry.captureException(error, {
            extra: {
                errorCode: error?.code,
                operation: 'verifyToken'
            }
        });
        console.error('Token verification failed - Error code:', error?.code);
        if (error?.code === 'auth/argument-error') {
            return res.status(403).json({
                error: 'Invalid token format. The token provided is not a valid Firebase ID token. Make sure you are calling `await user.getIdToken()` in your frontend, not `user.uid` or any other value.'
            });
        }

        if (error?.code === 'auth/id-token-expired') {
            return res.status(403).json({
                error: 'Token has expired. Please refresh your token and try again.'
            });
        }

        if (error?.code === 'auth/id-token-revoked') {
            return res.status(403).json({
                error: 'Token has been revoked. Please log in again.'
            });
        }

        return res.status(403).json({
            error: `Invalid or expired token: ${error?.message || 'Unknown error'}`
        });
    }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return next();
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : authHeader;

    if (!token) {
        return next();
    }

    if (token.length < 100 || token.split('.').length !== 3) {
        return next();
    }

    try {
        const decodedToken = await auth.verifyIdToken(token, false);
        req.user = decodedToken;
    } catch (error) {
    }

    next();
};
