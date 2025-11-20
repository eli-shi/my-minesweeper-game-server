import { PrismaClient } from '@prisma/client';

interface LeaderboardEntry {
    username: string;
    won: number;
    played: number;
    winRate: number;
}

export class LeaderboardService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }

    async getLeaderboard(difficulty: string): Promise<LeaderboardEntry[]> {
        let stats;

        switch (difficulty) {
            case 'easy':
                stats = await this.prisma.easyMode.findMany({
                    where: {
                        played: { gt: 0 }
                    },
                    include: {
                        user: {
                            select: {
                                username: true
                            }
                        }
                    },
                    orderBy: [
                        { won: 'desc' },
                        { played: 'asc' }
                    ],
                    take: 100
                });
                break;

            case 'medium':
                stats = await this.prisma.mediumMode.findMany({
                    where: {
                        played: { gt: 0 }
                    },
                    include: {
                        user: {
                            select: {
                                username: true
                            }
                        }
                    },
                    orderBy: [
                        { won: 'desc' },
                        { played: 'asc' }
                    ],
                    take: 100
                });
                break;

            case 'hard':
                stats = await this.prisma.hardMode.findMany({
                    where: {
                        played: { gt: 0 }
                    },
                    include: {
                        user: {
                            select: {
                                username: true
                            }
                        }
                    },
                    orderBy: [
                        { won: 'desc' },
                        { played: 'asc' }
                    ],
                    take: 100
                });
                break;

            default:
                throw new Error(`Invalid difficulty: ${difficulty}`);
        }

        return stats.map(entry => ({
            username: entry.user.username,
            won: entry.won,
            played: entry.played,
            winRate: entry.played > 0 ? Math.round((entry.won / entry.played) * 100) : 0
        }));
    }
}
