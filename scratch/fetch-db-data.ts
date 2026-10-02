import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fetchAll() {
  console.log("=== FETCHING LIVE DATA FROM MONGODB ATLAS ===");
  
  const categories = await prisma.category.findMany();
  console.log("\n--- CATEGORIES ---");
  console.log(JSON.stringify(categories, null, 2));

  const incomes = await prisma.income.findMany();
  console.log("\n--- INCOMES ---");
  console.log(JSON.stringify(incomes, null, 2));

  const expenses = await prisma.expense.findMany();
  console.log("\n--- EXPENSES ---");
  console.log(JSON.stringify(expenses, null, 2));

  await prisma.$disconnect();
}

fetchAll().catch((err) => {
  console.error("Error fetching data:", err);
  process.exit(1);
});
