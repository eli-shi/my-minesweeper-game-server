import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export class AdminController {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    getAllGames = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const skip = (page - 1) * limit;

            const [games, total] = await Promise.all([
                this.prisma.game.findMany({
                    skip,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            }
                        },
                        difficulty: true,
                    },
                }),
                this.prisma.game.count(),
            ]);

            res.json({
                games,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                }
            });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch games' });
        }
    };

    getGamesByUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId } = req.params;
            const limit = parseInt(req.query.limit as string) || 50;

            const games = await this.prisma.game.findMany({
                where: { user_id: userId },
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    difficulty: true,
                },
            });

            res.json(games);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch user games' });
        }
    };

    getGameStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const [totalGames, wonGames, lostGames, totalUsers] = await Promise.all([
                this.prisma.game.count(),
                this.prisma.game.count({ where: { status: 'won' } }),
                this.prisma.game.count({ where: { status: 'lost' } }),
                this.prisma.user.count(),
            ]);

            const gamesByDifficulty = await this.prisma.game.groupBy({
                by: ['diff_id', 'status'],
                _count: true,
            });

            res.json({
                totalGames,
                wonGames,
                lostGames,
                totalUsers,
                winRate: totalGames > 0 ? ((wonGames / totalGames) * 100).toFixed(2) + '%' : '0%',
                gamesByDifficulty,
            });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch stats' });
        }
    };

    getAllUsers = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const skip = (page - 1) * limit;

            const [users, total] = await Promise.all([
                this.prisma.user.findMany({
                    skip,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        role: true,
                        created_at: true,
                        last_game_played: true,
                        _count: {
                            select: {
                                games: true,
                            }
                        }
                    },
                }),
                this.prisma.user.count(),
            ]);

            res.json({
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                }
            });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch users' });
        }
    };

    updateUserRole = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId } = req.params;
            const { role } = req.body;

            if (!['user', 'admin'].includes(role)) {
                res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
                return;
            }

            const user = await this.prisma.user.update({
                where: { id: userId },
                data: { role },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                }
            });

            res.json(user);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update user role' });
        }
    };
}
