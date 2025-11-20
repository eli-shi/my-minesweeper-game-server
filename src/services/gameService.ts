import { PrismaClient } from '@prisma/client';
import { DIFFICULTY_CONFIGS, DIFFICULTY_IDS } from '../config/gameConfig.js';
import { gameCache } from './gameCache.js';
import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';

export interface Cell {
    isMine: boolean;
    adjacentMines: number;
}

export interface GameState {
    status: string;
    rows: number;
    cols: number;
    mines: number;
    board: Cell[][];
    revealed: boolean[][];
    flagged: boolean[][];
    remainingMines: number;
}

export class GameService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
        gameCache.destroy();
    }

    createActiveGame(
        userId: string | null,
        difficulty: string,
        board: Cell[][],
        revealed: boolean[][],
        flagged: boolean[][],
    ): string {
        const gameId = randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 2);

        gameCache.set(gameId, {
            gameId,
            userId,
            difficulty,
            board,
            revealed,
            flagged,
            status: 'playing',
            startedAt: new Date(),
            expiresAt,
        });

        return gameId;
    }

    getActiveGame(gameId: string, userId?: string): {
        gameId: string;
        userId: string | null;
        difficulty: string;
        board: Cell[][];
        revealed: boolean[][];
        flagged: boolean[][];
        status: string;
        startedAt: Date;
    } | null {
        const game = gameCache.get(gameId);
        if (!game) return null;

        if (game.userId && userId && game.userId !== userId) {
            throw new Error('Unauthorized to access this game');
        }

        return {
            gameId: game.gameId,
            userId: game.userId,
            difficulty: game.difficulty,
            board: game.board,
            revealed: game.revealed,
            flagged: game.flagged,
            status: game.status,
            startedAt: game.startedAt,
        };
    }

    updateActiveGame(
        gameId: string,
        revealed: boolean[][],
        flagged: boolean[][],
        status: string
    ): void {
        gameCache.update(gameId, { revealed, flagged, status });
    }

    deleteActiveGame(gameId: string): void {
        gameCache.delete(gameId);
    }

    generateBoard(rows: number, cols: number, mines: number, firstClickRow: number, firstClickCol: number): Cell[][] {
        const board: Cell[][] = Array(rows).fill(null).map(() =>
            Array(cols).fill(null).map(() => ({ isMine: false, adjacentMines: 0 }))
        );

        let minesPlaced = 0;
        while (minesPlaced < mines) {
            const row = Math.floor(Math.random() * rows);
            const col = Math.floor(Math.random() * cols);

            if (board[row][col].isMine) continue;
            if (Math.abs(row - firstClickRow) <= 1 && Math.abs(col - firstClickCol) <= 1) continue;

            board[row][col].isMine = true;
            minesPlaced++;
        }

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (!board[row][col].isMine) {
                    board[row][col].adjacentMines = this.countAdjacentMines(board, row, col, rows, cols);
                }
            }
        }

        return board;
    }

    private countAdjacentMines(board: Cell[][], row: number, col: number, rows: number, cols: number): number {
        let count = 0;
        for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
                if (r !== row || c !== col) {
                    if (board[r][c].isMine) count++;
                }
            }
        }
        return count;
    }

    revealCell(
        board: Cell[][],
        revealed: boolean[][],
        row: number,
        col: number,
        rows: number,
        cols: number
    ): void {
        if (revealed[row][col]) return;

        revealed[row][col] = true;

        if (board[row][col].adjacentMines === 0 && !board[row][col].isMine) {
            for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
                for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
                    if (r !== row || c !== col && !revealed[r][c]) {
                        this.revealCell(board, revealed, r, c, rows, cols);
                    }
                }
            }
        }
    }

    checkWin(board: Cell[][], revealed: boolean[][], rows: number, cols: number): boolean {
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (!board[row][col].isMine && !revealed[row][col]) {
                    return false;
                }
            }
        }
        return true;
    }

    calculateRemainingMines(mines: number, flagged: boolean[][], rows: number, cols: number): number {
        let flaggedCount = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (flagged[row][col]) flaggedCount++;
            }
        }
        return Math.max(0, mines - flaggedCount);
    }

    processReveal(
        board: Cell[][],
        revealed: boolean[][],
        flagged: boolean[][],
        row: number,
        col: number,
        rows: number,
        cols: number,
        mines: number
    ): { status: string; revealed: boolean[][]; gameOver: boolean } {
        if (flagged[row][col]) {
            throw new Error('Cannot reveal a flagged cell');
        }

        if (revealed[row][col]) {
            throw new Error('Cell is already revealed');
        }

        if (board[row][col].isMine) {
            const newRevealed = revealed.map(r => [...r]);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (board[r][c].isMine) {
                        newRevealed[r][c] = true;
                    }
                }
            }
            return { status: 'lost', revealed: newRevealed, gameOver: true };
        }

        const newRevealed = revealed.map(r => [...r]);
        this.revealCell(board, newRevealed, row, col, rows, cols);

        const won = this.checkWin(board, newRevealed, rows, cols);
        return {
            status: won ? 'won' : 'playing',
            revealed: newRevealed,
            gameOver: won,
        };
    }

    toggleFlag(flagged: boolean[][], row: number, col: number, revealed: boolean[][]): boolean[][] {
        if (revealed[row][col]) {
            throw new Error('Cannot flag a revealed cell');
        }

        const newFlagged = flagged.map(r => [...r]);
        newFlagged[row][col] = !newFlagged[row][col];
        return newFlagged;
    }

    async saveCompletedGame(userId: string, difficulty: string, status: 'won' | 'lost', solvedTime?: Date): Promise<void> {
        try {
            console.log(`[saveCompletedGame] Starting - userId: ${userId}, difficulty: ${difficulty}, status: ${status}`);

            const diffId = DIFFICULTY_IDS[difficulty.toLowerCase()];
            if (!diffId) {
                throw new Error(`Invalid difficulty: ${difficulty}`);
            }
            console.log(`[saveCompletedGame] Difficulty ID: ${diffId}`);

            const difficultyExists = await this.prisma.difficulty.findUnique({
                where: { diff_id: diffId },
            });

            if (!difficultyExists) {
                throw new Error(`Difficulty with ID ${diffId} (${difficulty}) does not exist in database. Please run: npm run prisma:seed`);
            }
            console.log(`[saveCompletedGame] Difficulty exists in DB:`, difficultyExists);

            await this.prisma.$transaction(async (tx) => {
                const game = await tx.game.create({
                    data: {
                        user_id: userId,
                        diff_id: diffId,
                        status: status,
                        solved_time: solvedTime || (status === 'won' ? new Date() : null),
                    },
                });
                console.log(`[saveCompletedGame] Game created:`, game);

                await tx.user.update({
                    where: { id: userId },
                    data: { last_game_played: new Date() },
                });
                console.log(`[saveCompletedGame] User updated with last_game_played`);

                await this.updateGameModeStatsWithTransaction(tx, userId, diffId, status === 'won');
                console.log(`[saveCompletedGame] Difficulty stats updated`);
            });

            console.log(`[saveCompletedGame] Completed successfully`);
        } catch (error) {
            Sentry.captureException(error, {
                extra: {
                    userId,
                    difficulty,
                    status,
                    operation: 'saveCompletedGame'
                }
            });
            console.error('[saveCompletedGame] Error:', error);
            throw error;
        }
    }

    async getUserGames(userId: string, limit: number = 10): Promise<any[]> {
        return await this.prisma.game.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: limit,
            include: {
                difficulty: true,
            },
        });
    }

    private async updateGameModeStats(userId: string, diffId: number, won: boolean): Promise<void> {
        await this.updateGameModeStatsWithTransaction(this.prisma, userId, diffId, won);
    }

    private async updateGameModeStatsWithTransaction(tx: any, userId: string, diffId: number, won: boolean): Promise<void> {
        if (diffId === 1) {
            const existing = await tx.easyMode.findUnique({
                where: { user_id: userId },
            });

            if (existing) {
                await tx.easyMode.update({
                    where: { user_id: userId },
                    data: {
                        played: existing.played + 1,
                        won: won ? existing.won + 1 : existing.won,
                    },
                });
            } else {
                await tx.easyMode.create({
                    data: {
                        user_id: userId,
                        diff_id: diffId,
                        played: 1,
                        won: won ? 1 : 0,
                    },
                });
            }
        } else if (diffId === 2) {
            const existing = await tx.mediumMode.findUnique({
                where: { user_id: userId },
            });

            if (existing) {
                await tx.mediumMode.update({
                    where: { user_id: userId },
                    data: {
                        played: existing.played + 1,
                        won: won ? existing.won + 1 : existing.won,
                    },
                });
            } else {
                await tx.mediumMode.create({
                    data: {
                        user_id: userId,
                        diff_id: diffId,
                        played: 1,
                        won: won ? 1 : 0,
                    },
                });
            }
        } else if (diffId === 3) {
            const existing = await tx.hardMode.findUnique({
                where: { user_id: userId },
            });

            if (existing) {
                await tx.hardMode.update({
                    where: { user_id: userId },
                    data: {
                        played: existing.played + 1,
                        won: won ? existing.won + 1 : existing.won,
                    },
                });
            } else {
                await tx.hardMode.create({
                    data: {
                        user_id: userId,
                        diff_id: diffId,
                        played: 1,
                        won: won ? 1 : 0,
                    },
                });
            }
        }
    }
}
