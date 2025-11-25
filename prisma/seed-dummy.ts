import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const NUM_USERS = 50;
const NUM_GAMES_PER_USER = 10;

async function main() {
    console.log('Start');

    console.log('Difficulties setup');
    const difficulties = [
        { diff_id: 1, diff_name: 'easy' },
        { diff_id: 2, diff_name: 'medium' },
        { diff_id: 3, diff_name: 'hard' },
    ];

    for (const difficulty of difficulties) {
        await prisma.difficulty.upsert({
            where: { diff_id: difficulty.diff_id },
            update: {},
            create: difficulty,
        });
    }
    console.log('Difficulties ready');

    console.log(`Creating ${NUM_USERS} users`);
    const userIds: string[] = [];
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    for (let i = 0; i < NUM_USERS; i++) {
        const userId = faker.string.uuid();
        const username = faker.internet.username().toLowerCase().slice(0, 20);
        const email = faker.internet.email().toLowerCase();

        try {
            await prisma.user.create({
                data: {
                    id: userId,
                    username,
                    email,
                    passwordHashed: hashedPassword,
                    created_at: faker.date.past({ years: 2 }),
                    last_game_played: faker.helpers.maybe(() => faker.date.recent({ days: 30 }), { probability: 0.7 }),
                },
            });
            userIds.push(userId);
        } catch (error) {
            console.log(`Skipped duplicate user: ${username}`);
        }
    }
    console.log(`Created ${userIds.length} users`);

    console.log(`Creating games`);
    let totalGames = 0;

    for (const userId of userIds) {
        const numGames = faker.number.int({ min: 5, max: NUM_GAMES_PER_USER });
        const userStats = {
            easy: { played: 0, won: 0 },
            medium: { played: 0, won: 0 },
            hard: { played: 0, won: 0 },
        };

        for (let i = 0; i < numGames; i++) {
            const diffId = faker.helpers.arrayElement([1, 2, 3]);
            const diffName = difficulties.find(d => d.diff_id === diffId)!.diff_name;
            const status = faker.helpers.weightedArrayElement([
                { weight: 6, value: 'won' },
                { weight: 4, value: 'lost' }
            ]);
            const won = status === 'won';

            const createdAt = faker.date.past({ years: 1 });
            const solvedTime = won
                ? faker.date.between({
                    from: createdAt,
                    to: new Date(createdAt.getTime() + (diffId * 10 * 60 * 1000))
                })
                : null;

            await prisma.game.create({
                data: {
                    user_id: userId,
                    diff_id: diffId,
                    status,
                    solved_time: solvedTime,
                    created_at: createdAt,
                },
            });

            userStats[diffName as 'easy' | 'medium' | 'hard'].played++;
            if (won) {
                userStats[diffName as 'easy' | 'medium' | 'hard'].won++;
            }

            totalGames++;
        }

        if (userStats.easy.played > 0) {
            await prisma.easyMode.upsert({
                where: { user_id: userId },
                update: {
                    played: userStats.easy.played,
                    won: userStats.easy.won,
                },
                create: {
                    user_id: userId,
                    diff_id: 1,
                    played: userStats.easy.played,
                    won: userStats.easy.won,
                },
            });
        }

        if (userStats.medium.played > 0) {
            await prisma.mediumMode.upsert({
                where: { user_id: userId },
                update: {
                    played: userStats.medium.played,
                    won: userStats.medium.won,
                },
                create: {
                    user_id: userId,
                    diff_id: 2,
                    played: userStats.medium.played,
                    won: userStats.medium.won,
                },
            });
        }

        if (userStats.hard.played > 0) {
            await prisma.hardMode.upsert({
                where: { user_id: userId },
                update: {
                    played: userStats.hard.played,
                    won: userStats.hard.won,
                },
                create: {
                    user_id: userId,
                    diff_id: 3,
                    played: userStats.hard.played,
                    won: userStats.hard.won,
                },
            });
        }
    }
    console.log(`Created ${totalGames} games with stats`);
    console.log('\nSummary:');
    console.log(`   Users: ${userIds.length}`);
    console.log(`   Games: ${totalGames}`);
    console.log('\nDummy data generation completed!');
}

main()
    .catch((e) => {
        console.error('Error generating dummy data:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
