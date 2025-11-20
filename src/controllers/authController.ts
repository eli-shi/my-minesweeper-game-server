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

            const resetLink = await this.authService.sendPasswordResetEmail(email);

            if (process.env.NODE_ENV === 'development') {
                res.json({
                    message: 'Password reset link generated',
                    resetLink
                });
            } else {
                res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
            }
        } catch (error) {
            res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
        }
    };

    passwordReset = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId, newPassword } = req.body;

            if (!userId || !newPassword) {
                res.status(400).json({ error: 'User ID and new password are required' });
                return;
            }

            if (newPassword.length < 6) {
                res.status(400).json({ error: 'Password must be at least 6 characters long' });
                return;
            }

            await this.authService.updatePassword(userId, newPassword);

            res.json({ message: 'Password has been updated successfully.' });
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

            const userRecord = await this.authService.verifyToken(idToken);
            await this.authService.getOrCreateUser(userRecord);

            res.json({ message: 'Token verified' });
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Token refresh failed' });
        }
    };
}
