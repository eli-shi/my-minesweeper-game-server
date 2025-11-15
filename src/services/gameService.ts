import { PrismaClient } from '@prisma/client';
import { DIFFICULTY_CONFIGS, DIFFICULTY_IDS } from '../config/gameConfig.js';

export interface Cell {
    isMine: boolean;
    adjacentMines: number;
}

export interface GameState {
    status: string; // 'playing', 'won', 'lost'
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

    // Cleanup method for graceful shutdown
    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }

    // GAME LOGIC

    /**
     * Generate a minesweeper board with mines and adjacent mine counts
     */
    generateBoard(rows: number, cols: number, mines: number, firstClickRow: number, firstClickCol: number): Cell[][] {
        const board: Cell[][] = Array(rows).fill(null).map(() =>
            Array(cols).fill(null).map(() => ({ isMine: false, adjacentMines: 0 }))
        );

        // Place mines randomly, ensuring first click is safe
        let minesPlaced = 0;
        while (minesPlaced < mines) {
            const row = Math.floor(Math.random() * rows);
            const col = Math.floor(Math.random() * cols);

            // Don't place mine on first click cell or adjacent cells
            if (board[row][col].isMine) continue;
            if (Math.abs(row - firstClickRow) <= 1 && Math.abs(col - firstClickCol) <= 1) continue;

            board[row][col].isMine = true;
            minesPlaced++;
        }

        // Calculate adjacent mine counts
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (!board[row][col].isMine) {
                    board[row][col].adjacentMines = this.countAdjacentMines(board, row, col, rows, cols);
                }
            }
        }

        return board;
    }

    /**
     * Count mines adjacent to a cell
     */
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

    /**
     * Reveal a cell and auto-reveal adjacent cells if they have no adjacent mines
     */
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

        // Auto-reveal adjacent cells if this cell has no adjacent mines
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

    /**
     * Check if game is won (all non-mine cells are revealed)
     */
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

    /**
     * Calculate remaining mines (total mines - flagged cells)
     */
    calculateRemainingMines(mines: number, flagged: boolean[][], rows: number, cols: number): number {
        let flaggedCount = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (flagged[row][col]) flaggedCount++;
            }
        }
        return Math.max(0, mines - flaggedCount);
    }

    /**
     * Process a reveal action and return updated game state
     */
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
        // Check if cell is flagged
        if (flagged[row][col]) {
            throw new Error('Cannot reveal a flagged cell');
        }

        // Check if cell is already revealed
        if (revealed[row][col]) {
            throw new Error('Cell is already revealed');
        }

        // Check if clicked on mine
        if (board[row][col].isMine) {
            // Game over - reveal all mines
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

        // Reveal cell
        const newRevealed = revealed.map(r => [...r]);
        this.revealCell(board, newRevealed, row, col, rows, cols);

        // Check for win
        const won = this.checkWin(board, newRevealed, rows, cols);
        return {
            status: won ? 'won' : 'playing',
            revealed: newRevealed,
            gameOver: won,
        };
    }

    /**
     * Toggle flag on a cell
     */
    toggleFlag(flagged: boolean[][], row: number, col: number, revealed: boolean[][]): boolean[][] {
        // Can't flag revealed cells
        if (revealed[row][col]) {
            throw new Error('Cannot flag a revealed cell');
        }

        // Toggle flag
        const newFlagged = flagged.map(r => [...r]);
        newFlagged[row][col] = !newFlagged[row][col];
        return newFlagged;
    }

    // DATABASE OPERATIONS (only for completed games and statistics)

    /**
     * Save a completed game to the database
     */
    async saveCompletedGame(userId: string, difficulty: string, status: 'won' | 'lost', solvedTime?: Date): Promise<void> {
        const diffId = DIFFICULTY_IDS[difficulty.toLowerCase()];
        if (!diffId) {
            throw new Error(`Invalid difficulty: ${difficulty}`);
        }

        // Verify difficulty exists in database
        const difficultyExists = await this.prisma.difficulty.findUnique({
            where: { diff_id: diffId },
        });

        if (!difficultyExists) {
            throw new Error(`Difficulty with ID ${diffId} (${difficulty}) does not exist in database. Please run: npm run prisma:seed`);
        }

        // Save completed game
        await this.prisma.game.create({
            data: {
                user_id: userId,
                diff_id: diffId,
                status: status,
                solved_time: solvedTime || (status === 'won' ? new Date() : null),
            },
        });

        // Update user's last game played
        await this.prisma.user.update({
            where: { id: userId },
            data: { last_game_played: new Date() },
        });

        // Update difficulty statistics
        await this.updateDifficultyStats(userId, diffId, status === 'won');
    }

    /**
     * Get user's game history (only completed games)
     */
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

    /**
     * Update difficulty statistics
     */
    private async updateDifficultyStats(userId: string, diffId: number, won: boolean): Promise<void> {
        if (diffId === 1) {
            // Easy mode
            const existing = await this.prisma.easyMode.findUnique({
                where: { user_id: userId },
            });

            if (existing) {
                await this.prisma.easyMode.update({
                    where: { user_id: userId },
                    data: {
                        played: existing.played + 1,
                        won: won ? existing.won + 1 : existing.won,
                    },
                });
            } else {
                await this.prisma.easyMode.create({
                    data: {
                        user_id: userId,
                        diff_id: diffId,
                        played: 1,
                        won: won ? 1 : 0,
                    },
                });
            }
        } else if (diffId === 2) {
            // Medium mode
            const existing = await this.prisma.mediumMode.findUnique({
                where: { user_id: userId },
            });

            if (existing) {
                await this.prisma.mediumMode.update({
                    where: { user_id: userId },
                    data: {
                        played: existing.played + 1,
                        won: won ? existing.won + 1 : existing.won,
                    },
                });
            } else {
                await this.prisma.mediumMode.create({
                    data: {
                        user_id: userId,
                        diff_id: diffId,
                        played: 1,
                        won: won ? 1 : 0,
                    },
                });
            }
        } else if (diffId === 3) {
            // Hard mode
            const existing = await this.prisma.hardMode.findUnique({
                where: { user_id: userId },
            });

            if (existing) {
                await this.prisma.hardMode.update({
                    where: { user_id: userId },
                    data: {
                        played: existing.played + 1,
                        won: won ? existing.won + 1 : existing.won,
                    },
                });
            } else {
                await this.prisma.hardMode.create({
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
