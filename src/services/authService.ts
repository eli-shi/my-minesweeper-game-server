import { PrismaClient } from '@prisma/client';
import admin from '../config/firebase.js';
import { getAuth, UserRecord } from 'firebase-admin/auth';

// Get auth instance from initialized admin (use default app)
const auth = getAuth();

export class AuthService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    // Cleanup method for graceful shutdown
    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }

    // TOKEN MANAGEMENT

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

    // USER MANAGEMENT

    async createUser(email: string, password: string): Promise<any> {
        try {
            // Create Firebase user
            const firebaseUser = await auth.createUser({
                email,
                password,
            });

            // Hash password for local storage
            const bcrypt = await import('bcrypt');
            const passwordHashed = await bcrypt.hash(password, 10);

            // Create user in database
            const user = await this.prisma.user.create({
                data: {
                    id: String(firebaseUser.uid),
                    email: firebaseUser.email || '',
                    username: email.split('@')[0], // Generate username from email
                    passwordHashed,
                },
            });
            return user;
        } catch (error) {
            throw new Error(`User creation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getOrCreateUser(userRecord: UserRecord, password?: string): Promise<any> {
        try {
            // Ensure uid is a string and explicitly type it
            const userId: string = String(userRecord.uid).trim();

            // Debug: log the type and value
            console.log('Looking up user with id:', userId, 'Type:', typeof userId, 'Length:', userId.length);

            // Try findFirst instead of findUnique to avoid potential caching issues
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
            throw new Error(`User deletion failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
