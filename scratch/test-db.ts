import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log("Connecting to database...");
  try {
    await prisma.$connect();
    console.log("Successfully connected to database!");
    const count = await prisma.category.count();
    console.log(`Category count: ${count}`);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
