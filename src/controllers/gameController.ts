import { Request, Response } from 'express';
import { GameService } from '../services/gameService.js';
import { DIFFICULTY_CONFIGS } from '../config/gameConfig.js';
import { gameSchemas } from '../validation/zodSchemas.js';

const MAX_GAME_DURATION_MS = 20 * 60 * 1000;

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
            const userId = req.user?.uid ?? null;

            const config = DIFFICULTY_CONFIGS[difficulty.toLowerCase()];
            if (!config) {
                res.status(400).json({ error: `Invalid difficulty: ${difficulty}` });
                return;
            }

            const board = this.gameService.generateBoard(
                config.rows,
                config.cols,
                config.mines,
                firstClickRow,
                firstClickCol
            );

            const revealed: boolean[][] = Array(config.rows).fill(null).map(() => Array(config.cols).fill(false));
            const flagged: boolean[][] = Array(config.rows).fill(null).map(() => Array(config.cols).fill(false));

            this.gameService.revealCell(board, revealed, firstClickRow, firstClickCol, config.rows, config.cols);

            const { gameId, sessionToken } = this.gameService.createActiveGame(
                userId,
                difficulty,
                board,
                revealed,
                flagged
            );

            const visibleBoard = revealed.map((row, r) =>
                row.map((isRevealed, c) =>
                    isRevealed ? board[r][c] : null
                )
            );

            const response: any = {
                gameId,
                status: 'playing',
                rows: config.rows,
                cols: config.cols,
                mines: config.mines,
                flagged,
                visibleBoard,
                remainingMines: this.gameService.calculateRemainingMines(config.mines, flagged, config.rows, config.cols),
            };

            // Include sessionToken for guest games
            if (sessionToken) {
                response.sessionToken = sessionToken;
            }

            res.status(201).json(response);
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create game' });
        }
    };

    revealCell = async (req: Request, res: Response): Promise<void> => {
        try {
            const validatedData = gameSchemas.revealBody.parse(req.body);
            const { gameId, row, col, sessionToken } = validatedData;
            const userId = req.user?.uid;

            const game = this.gameService.getActiveGame(gameId, userId, sessionToken);
            if (!game) {
                res.status(404).json({ error: 'Game not found' });
                return;
            }

            if (game.status !== 'playing') {
                res.status(400).json({ error: 'Game is already over' });
                return;
            }

            const config = DIFFICULTY_CONFIGS[game.difficulty.toLowerCase()];
            if (!config) {
                res.status(400).json({ error: `Invalid difficulty: ${game.difficulty}` });
                return;
            }

            const elapsedMs = Date.now() - game.startedAt.getTime();
            if (elapsedMs > MAX_GAME_DURATION_MS) {
                this.gameService.updateActiveGame(gameId, game.revealed, game.flagged, 'lost');
                if (game.userId) {
                    try {
                        await this.gameService.saveCompletedGame(game.userId, game.difficulty, 'lost', new Date());
                    } catch (error) {

                    }
                }
                this.gameService.deleteActiveGame(gameId);

                res.json({
                    status: 'lost',
                    reason: 'time_limit_exceeded',
                    board: game.board,
                    remainingMines: this.gameService.calculateRemainingMines(config.mines, game.flagged, config.rows, config.cols),
                });
                return;
            }

            const result = this.gameService.processReveal(
                game.board,
                game.revealed,
                game.flagged,
                row,
                col,
                config.rows,
                config.cols,
                config.mines
            );

            this.gameService.updateActiveGame(gameId, result.revealed, game.flagged, result.status);

            if (result.gameOver) {
                if (game.userId) {
                    try {
                        await this.gameService.saveCompletedGame(
                            game.userId,
                            game.difficulty,
                            result.status as 'won' | 'lost',
                            result.status === 'won' ? new Date() : undefined
                        );
                    } catch (error) {

                    }
                }
                this.gameService.deleteActiveGame(gameId);

                res.json({
                    status: result.status,
                    board: game.board,
                    remainingMines: this.gameService.calculateRemainingMines(config.mines, game.flagged, config.rows, config.cols),
                });
            } else {
                const visibleBoard = result.revealed.map((row, r) =>
                    row.map((isRevealed, c) =>
                        isRevealed ? game.board[r][c] : null
                    )
                );

                res.json({
                    status: result.status,
                    visibleBoard,
                    remainingMines: this.gameService.calculateRemainingMines(config.mines, game.flagged, config.rows, config.cols),
                });
            }
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to reveal cell' });
        }
    };

    toggleFlag = async (req: Request, res: Response): Promise<void> => {
        try {
            const validatedData = gameSchemas.toggleFlagBody.parse(req.body);
            const { gameId, row, col, sessionToken } = validatedData;
            const userId = req.user?.uid;

            const game = this.gameService.getActiveGame(gameId, userId, sessionToken);
            if (!game) {
                res.status(404).json({ error: 'Game not found' });
                return;
            }

            if (game.status !== 'playing') {
                res.status(400).json({ error: 'Game is already over' });
                return;
            }

            const config = DIFFICULTY_CONFIGS[game.difficulty.toLowerCase()];
            if (!config) {
                res.status(400).json({ error: `Invalid difficulty: ${game.difficulty}` });
                return;
            }

            const newFlagged = this.gameService.toggleFlag(game.flagged, row, col, game.revealed);
            this.gameService.updateActiveGame(gameId, game.revealed, newFlagged, game.status);

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

            const limitParam = req.query.limit;
            const limit = limitParam ? parseInt(String(limitParam), 10) : 10;

            const games = await this.gameService.getUserGames(userId, limit);
            res.json(games);
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get game history' });
        }
    };
}
