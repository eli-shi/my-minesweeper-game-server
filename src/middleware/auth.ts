import { Request, Response, NextFunction } from 'express';
// Import firebase config to ensure initialization
import '../config/firebase.js';
import { getAuth } from 'firebase-admin/auth';

// Get auth instance from initialized admin (use default app)
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

    // Debug logging
    console.log('Token received - Length:', token.length);
    console.log('Token preview (first 50 chars):', token.substring(0, 50));
    console.log('Token preview (last 50 chars):', token.substring(Math.max(0, token.length - 50)));

    // Validate token format - JWT tokens are typically 200+ characters
    // Firebase ID tokens are usually 800-1200 characters
    if (token.length < 100) {
        console.error('Token appears to be too short to be a JWT. Length:', token.length);
        return res.status(403).json({
            error: 'Invalid token format. Expected Firebase ID token (JWT), but received a short string. Make sure you are sending the Firebase ID token, not the user ID.'
        });
    }

    // Check if it looks like a JWT (should have 3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
        console.error('Token does not appear to be a valid JWT. Parts:', parts.length);
        return res.status(403).json({
            error: 'Invalid token format. JWT tokens should have 3 parts separated by dots. Make sure you are sending the complete Firebase ID token.'
        });
    }

    try {
        const decodedToken = await auth.verifyIdToken(token, true); // Check revoked tokens
        req.user = decodedToken;
        next();
    } catch (error: any) {
        console.error('Error verifying token:', error);
        console.error('Error code:', error?.code);
        console.error('Error message:', error?.message);

        // Provide more helpful error messages
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

/**
 * Optional authentication middleware - tries to verify token but doesn't fail if invalid
 * Useful for endpoints like logout that should work even with expired tokens
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        // No auth header - continue without user
        return next();
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : authHeader;

    if (!token) {
        // No token - continue without user
        return next();
    }

    // Validate token format
    if (token.length < 100 || token.split('.').length !== 3) {
        // Invalid format - continue without user
        return next();
    }

    try {
        // Try to verify token, but don't fail if it's invalid
        const decodedToken = await auth.verifyIdToken(token, false); // Don't check revoked tokens for optional auth
        req.user = decodedToken;
    } catch (error) {
        // Token is invalid/expired - that's okay for optional auth, just continue without user
        // Don't set req.user, but don't return an error either
    }

    next();
};
