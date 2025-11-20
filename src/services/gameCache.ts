import { Cell } from './gameService.js';

interface CachedGame {
    gameId: string;
    userId: string | null;
    sessionToken?: string; // For guest games - prevents cross-guest access
    difficulty: string;
    board: Cell[][];
    revealed: boolean[][];
    flagged: boolean[][];
    status: string;
    startedAt: Date;
    expiresAt: Date;
}

class GameCache {
    private games: Map<string, CachedGame> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    set(gameId: string, game: CachedGame): void {
        this.games.set(gameId, game);
    }

    get(gameId: string): CachedGame | undefined {
        const game = this.games.get(gameId);
        if (!game) return undefined;

        if (game.expiresAt < new Date()) {
            this.games.delete(gameId);
            return undefined;
        }
        return game;
    }

    update(gameId: string, updates: Partial<Omit<CachedGame, 'gameId' | 'startedAt' | 'expiresAt'>>): void {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error('Game not found in cache');
        }
        Object.assign(game, updates);
    }

    delete(gameId: string): void {
        this.games.delete(gameId);
    }

    private cleanup(): void {
        const now = new Date();
        let cleaned = 0;
        for (const [gameId, game] of this.games.entries()) {
            if (game.expiresAt < now) {
                this.games.delete(gameId);
                cleaned++;
            }
        }
    }

    getStats(): { totalGames: number; activeGames: number } {
        const now = new Date();
        let activeGames = 0;
        for (const game of this.games.values()) {
            if (game.expiresAt >= now) {
                activeGames++;
            }
        }
        return {
            totalGames: this.games.size,
            activeGames
        };
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.games.clear();
    }
}

export const gameCache = new GameCache();
