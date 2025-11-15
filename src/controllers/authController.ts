import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    register = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({ error: 'Email and password are required' });
                return;
            }

            const user = await this.authService.createUser(email, password);
            res.status(201).json(user);
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' });
        }
    };

    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { idToken } = req.body;

            if (!idToken) {
                res.status(400).json({ error: 'ID token is required' });
                return;
            }

            const userRecord = await this.authService.verifyToken(idToken);
            const user = await this.authService.getOrCreateUser(userRecord);

            // Return user data - frontend should use the Firebase ID token directly for authenticated requests
            // No need for custom tokens - the ID token is what the middleware verifies
            res.json({ user });
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Login failed' });
        }
    };

    logout = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.uid;

            if (userId) {
                try {
                    await this.authService.revokeRefreshTokens(userId);
                } catch (revokeError) {
                    console.warn(
                        'Optional logout: could not revoke tokens (possibly already revoked):',
                        revokeError instanceof Error ? revokeError.message : revokeError
                    );
                }
            }

            // Always return success so the frontend can clear local state even if token was invalid/expired
            res.json({ message: 'Successfully logged out' });
        } catch (error) {
            console.error('Logout error (returning success anyway):', error);
            res.json({ message: 'Successfully logged out' });
        }
    };

    getProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.uid;

            if (!userId) {
                res.status(400).json({ error: 'User not authenticated' });
                return;
            }

            const user = await this.authService.getCurrentUser(userId);
            res.json(user);
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get profile' });
        }
    };

    passwordResetRequest = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email } = req.body;

            if (!email) {
                res.status(400).json({ error: 'Email is required' });
                return;
            }

            // TODO: Implement password reset email sending
            res.json({ message: 'Password reset email sent (not implemented yet)' });
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Password reset request failed' });
        }
    };

    passwordReset = async (req: Request, res: Response): Promise<void> => {
        try {
            // TODO: Implement password reset with token validation
            res.json({ message: 'Password reset (not implemented yet)' });
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Password reset failed' });
        }
    };

    refreshToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { idToken } = req.body;

            if (!idToken) {
                res.status(400).json({ error: 'ID token is required' });
                return;
            }

            // Verify the token and get/create user to ensure they exist in database
            const userRecord = await this.authService.verifyToken(idToken);
            await this.authService.getOrCreateUser(userRecord);

            // Just return success - frontend should use the Firebase ID token directly
            // The ID token itself is what gets refreshed by Firebase SDK
            res.json({ message: 'Token verified' });
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Token refresh failed' });
        }
    };
}
