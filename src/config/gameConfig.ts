export interface DifficultyConfig {
    name: string;
    rows: number;
    cols: number;
    mines: number;
}

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
    easy: {
        name: 'Easy',
        rows: 9,
        cols: 9,
        mines: 10,
    },
    medium: {
        name: 'Medium',
        rows: 16,
        cols: 16,
        mines: 40,
    },
    hard: {
        name: 'Hard',
        rows: 16,
        cols: 30,
        mines: 99,
    },
};

export const DIFFICULTY_IDS: Record<string, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
};

