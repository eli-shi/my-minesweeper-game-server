import { PrismaClient } from '@prisma/client';
import admin from '../config/firebase.js';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import * as Sentry from '@sentry/node';

const auth = getAuth();

export class AuthService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }

    async generateToken(userId: string, customClaims?: object): Promise<string> {
        try {
            const customToken = await auth.createCustomToken(userId, customClaims);
            return customToken;
        } catch (error) {
            throw new Error(`Token generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async verifyToken(token: string): Promise<UserRecord> {
        try {
            const decodedToken = await auth.verifyIdToken(token);
            const userRecord = await auth.getUser(decodedToken.uid);
            return userRecord;
        } catch (error) {
            throw new Error(`Token verification failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async revokeRefreshTokens(userId: string): Promise<void> {
        try {
            await auth.revokeRefreshTokens(userId);
        } catch (error) {
            throw new Error(`Failed to revoke refresh tokens: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async createUser(email: string, password: string): Promise<any> {
        try {
            const firebaseUser = await auth.createUser({
                email,
                password,
            });

            const bcrypt = await import('bcrypt');
            const passwordHashed = await bcrypt.hash(password, 10);

            const user = await this.prisma.user.create({
                data: {
                    id: String(firebaseUser.uid),
                    email: firebaseUser.email || '',
                    username: email.split('@')[0],
                    passwordHashed,
                },
            });
            return user;
        } catch (error) {
            Sentry.captureException(error, {
                extra: {
                    email,
                    operation: 'createUser'
                }
            });
            throw new Error(`User creation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getOrCreateUser(userRecord: UserRecord, password?: string): Promise<any> {
        try {
            const userId: string = String(userRecord.uid).trim();

            console.log('Looking up user with id:', userId, 'Type:', typeof userId, 'Length:', userId.length);

            let user = await this.prisma.user.findFirst({
                where: {
                    id: userId
                }
            });
            if (!user) {
                let passwordHashed = '';
                if (password) {
                    const bcrypt = await import('bcrypt');
                    passwordHashed = await bcrypt.hash(password, 10);
                }
                user = await this.prisma.user.create({
                    data: {
                        id: userId,
                        email: userRecord.email || '',
                        username: userRecord.email?.split('@')[0] || userId.substring(0, 8),
                        passwordHashed,
                    },
                });
            }
            return user;
        } catch (error) {
            throw new Error(`Get or create user failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getCurrentUser(userId: string): Promise<any> {
        try {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            throw new Error(`Failed to get current user: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async updateUserProfile(userId: string, data: Partial<any>): Promise<any> {
        try {
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data,
            });
            return updatedUser;
        } catch (error) {
            throw new Error(`Profile update failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async deleteUser(userId: string): Promise<void> {
        try {
            await auth.deleteUser(userId);
            await this.prisma.user.delete({ where: { id: userId } });
        } catch (error) {
            Sentry.captureException(error, {
                extra: {
                    userId,
                    operation: 'deleteUser'
                }
            });
            throw new Error(`User deletion failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async sendPasswordResetEmail(email: string): Promise<string> {
        try {
            const link = await auth.generatePasswordResetLink(email);

            console.log(`Password reset link for ${email}: ${link}`);
            return link;
        } catch (error) {
            Sentry.captureException(error, {
                extra: {
                    email,
                    operation: 'sendPasswordResetEmail'
                }
            });
            throw new Error(`Failed to send password reset email: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async updatePassword(userId: string, newPassword: string): Promise<void> {
        try {
            await auth.updateUser(userId, {
                password: newPassword,
            });
        } catch (error) {
            throw new Error(`Failed to update password: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
