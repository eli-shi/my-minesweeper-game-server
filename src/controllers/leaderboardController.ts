import { Request, Response } from 'express';
import { LeaderboardService } from '../services/leaderboardService';

export class LeaderboardController {
    private leaderboardService: LeaderboardService;

    constructor() {
        this.leaderboardService = new LeaderboardService();
    }

    getLeaderboards = async (req: Request, res: Response): Promise<void> => {
        try {
            const difficulty = req.query.difficulty as string;

            if (!difficulty) {
                res.status(400).json({ error: 'Difficulty parameter is required' });
                return;
            }

            const normalizedDifficulty = difficulty.toLowerCase();

            if (!['easy', 'medium', 'hard'].includes(normalizedDifficulty)) {
                res.status(400).json({ error: 'Invalid difficulty. Must be easy, medium, or hard' });
                return;
            }

            const leaderboard = await this.leaderboardService.getLeaderboard(normalizedDifficulty);
            res.json(leaderboard);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch leaderboards'
            });
        }
    };
}
