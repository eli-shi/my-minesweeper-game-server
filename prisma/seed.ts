import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const difficulties = [
        { diff_id: 1, diff_name: 'easy' },
        { diff_id: 2, diff_name: 'medium' },
        { diff_id: 3, diff_name: 'hard' },
    ];

    for (const difficulty of difficulties) {
        const existing = await prisma.difficulty.findUnique({
            where: { diff_id: difficulty.diff_id },
        });

        if (!existing) {
            await prisma.difficulty.create({
                data: difficulty,
            });
            console.log(`Created difficulty: ${difficulty.diff_name} (ID: ${difficulty.diff_id})`);
        } else {
            console.log(`Difficulty ${difficulty.diff_name} (ID: ${difficulty.diff_id}) already exists`);
        }
    }

    await prisma.$executeRawUnsafe(`
    SELECT setval('"Difficulty_diff_id_seq"', (SELECT MAX("diff_id") FROM "Difficulty"), true);
  `);

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

