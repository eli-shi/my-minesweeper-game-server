import { Request, Response } from 'express';
import { GameService } from '../services/gameService.js';
import { DIFFICULTY_CONFIGS } from '../config/gameConfig.js';
import { gameSchemas } from '../validation/zodSchemas.js';

const MAX_GAME_DURATION_MS = 5 * 60 * 1000;

export class GameController {
    private gameService: GameService;

    constructor() {
        this.gameService = new GameService();
    }

    getDifficulties = async (req: Request, res: Response): Promise<void> => {
        try {
            res.json(DIFFICULTY_CONFIGS);
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get difficulties' });
        }
    };

    createGame = async (req: Request, res: Response): Promise<void> => {
        try {
            const validatedData = gameSchemas.createBody.parse(req.body);
            const { difficulty, firstClickRow, firstClickCol } = validatedData;

            const config = DIFFICULTY_CONFIGS[difficulty.toLowerCase()];
            if (!config) {
                res.status(400).json({ error: `Invalid difficulty: ${difficulty}` });
                return;
            }

            // Generate board
            const board = this.gameService.generateBoard(
                config.rows,
                config.cols,
                config.mines,
                firstClickRow,
                firstClickCol
            );

            // Initialize revealed and flagged arrays
            const revealed: boolean[][] = Array(config.rows).fill(null).map(() => Array(config.cols).fill(false));
            const flagged: boolean[][] = Array(config.rows).fill(null).map(() => Array(config.cols).fill(false));

            // Reveal first click
            this.gameService.revealCell(board, revealed, firstClickRow, firstClickCol, config.rows, config.cols);

            res.status(201).json({
                status: 'playing',
                rows: config.rows,
                cols: config.cols,
                mines: config.mines,
                board: board,
                revealed: revealed,
                flagged: flagged,
                remainingMines: this.gameService.calculateRemainingMines(config.mines, flagged, config.rows, config.cols),
                startedAt: new Date().toISOString(),
            });
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create game' });
        }
    };

    revealCell = async (req: Request, res: Response): Promise<void> => {
        try {
            const validatedData = gameSchemas.revealBody.parse(req.body);
            const { board, revealed, flagged, row, col, difficulty, startedAt } = validatedData;
            const userId = req.user?.uid ?? null;

            const config = DIFFICULTY_CONFIGS[difficulty.toLowerCase()];
            if (!config) {
                res.status(400).json({ error: `Invalid difficulty: ${difficulty}` });
                return;
            }

            const elapsedMs = Date.now() - startedAt.getTime();
            if (elapsedMs > MAX_GAME_DURATION_MS) {
                const finalRevealed = revealed.map(row => row.map(() => true));
                if (userId) {
                    await this.gameService.saveCompletedGame(
                        userId,
                        difficulty,
                        'lost',
                        new Date()
                    );
                }
                res.json({
                    status: 'lost',
                    reason: 'time_limit_exceeded',
                    revealed: finalRevealed,
                    remainingMines: this.gameService.calculateRemainingMines(config.mines, flagged, config.rows, config.cols),
                });
                return;
            }

            const result = this.gameService.processReveal(
                board,
                revealed,
                flagged,
                row,
                col,
                config.rows,
                config.cols,
                config.mines
            );

            if (result.gameOver && userId) {
                await this.gameService.saveCompletedGame(
                    userId,
                    difficulty,
                    result.status as 'won' | 'lost',
                    result.status === 'won' ? new Date() : undefined
                );
            }

            res.json({
                status: result.status,
                revealed: result.revealed,
                remainingMines: this.gameService.calculateRemainingMines(config.mines, flagged, config.rows, config.cols),
            });
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to reveal cell' });
        }
    };

    toggleFlag = async (req: Request, res: Response): Promise<void> => {
        try {
            const validatedData = gameSchemas.toggleFlagBody.parse(req.body);
            const { revealed, flagged, row, col, difficulty } = validatedData;

            const config = DIFFICULTY_CONFIGS[difficulty.toLowerCase()];
            if (!config) {
                res.status(400).json({ error: `Invalid difficulty: ${difficulty}` });
                return;
            }

            // Toggle flag
            const newFlagged = this.gameService.toggleFlag(flagged, row, col, revealed);

            res.json({
                flagged: newFlagged,
                remainingMines: this.gameService.calculateRemainingMines(config.mines, newFlagged, config.rows, config.cols),
            });
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to toggle flag' });
        }
    };

    getGameHistory = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log('getGameHistory called, user:', req.user);
            console.log('query params:', req.query);

            const userId = req.user?.uid;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const limitParam = req.query.limit;
            const limit = limitParam ? parseInt(String(limitParam), 10) : 10;

            console.log('Fetching games for user:', userId, 'with limit:', limit);
            const games = await this.gameService.getUserGames(userId, limit);
            console.log('Found games:', games.length);
            res.json(games);
        } catch (error) {
            console.error('Error in getGameHistory:', error);
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get game history' });
        }
    };
}
