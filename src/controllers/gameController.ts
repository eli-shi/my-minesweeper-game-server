import { Request, Response } from 'express';
import { GameService } from '../services/gameService.js';
import { DIFFICULTY_CONFIGS } from '../config/gameConfig.js';
import { gameSchemas } from '../validation/zodSchemas.js';

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
            });
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create game' });
        }
    };

    revealCell = async (req: Request, res: Response): Promise<void> => {
        try {
            const validatedData = gameSchemas.revealBody.parse(req.body);
            const { board, revealed, flagged, row, col, difficulty } = validatedData;
            const userId = req.user?.uid ?? null;

            const config = DIFFICULTY_CONFIGS[difficulty.toLowerCase()];
            if (!config) {
                res.status(400).json({ error: `Invalid difficulty: ${difficulty}` });
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
            const userId = req.user?.uid;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const limit = (req.query.limit as number | undefined) ?? 10;
            const games = await this.gameService.getUserGames(userId, limit);
            res.json(games);
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get game history' });
        }
    };
}
