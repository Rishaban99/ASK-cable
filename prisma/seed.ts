import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma database seeding for MongoDB Atlas...');

  // Clean existing collections to ensure fresh schema compatibility
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.category.deleteMany();

  // Create Default Income Categories
  const salaryCat = await prisma.category.create({
    data: {
      name: 'Salary & Payouts',
      type: 'INCOME',
      icon: 'Briefcase',
      color: '#10B981',
      isDefault: true,
    },
  });

  const bizCat = await prisma.category.create({
    data: {
      name: 'Business Revenue',
      type: 'INCOME',
      icon: 'TrendingUp',
      color: '#059669',
      isDefault: true,
    },
  });

  const investCat = await prisma.category.create({
    data: {
      name: 'Investments',
      type: 'INCOME',
      icon: 'DollarSign',
      color: '#14B8A6',
      isDefault: true,
    },
  });

  // Create Default Expense Categories
  const housingCat = await prisma.category.create({
    data: {
      name: 'Housing & Rent',
      type: 'EXPENSE',
      icon: 'Home',
      color: '#F43F5E',
      isDefault: true,
    },
  });

  const groceriesCat = await prisma.category.create({
    data: {
      name: 'Groceries & Food',
      type: 'EXPENSE',
      icon: 'ShoppingBag',
      color: '#F59E0B',
      isDefault: true,
    },
  });

  const utilsCat = await prisma.category.create({
    data: {
      name: 'Utilities & Bills',
      type: 'EXPENSE',
      icon: 'Zap',
      color: '#6366F1',
      isDefault: true,
    },
  });

  const equipCat = await prisma.category.create({
    data: {
      name: 'Equipment & Office',
      type: 'EXPENSE',
      icon: 'Monitor',
      color: '#8B5CF6',
      isDefault: true,
    },
  });

  const today = new Date().toISOString().split('T')[0];

  // Create Initial Sample Income Entries
  await prisma.income.createMany({
    data: [
      {
        categoryId: salaryCat.id,
        amount: 250000,
        date: today,
        description: 'Monthly Salary Payout',
        paymentMethod: 'BANK_TRANSFER',
        tags: ['salary', 'primary'],
      },
      {
        categoryId: bizCat.id,
        amount: 85000,
        date: today,
        description: 'Client Project Milestone',
        paymentMethod: 'BANK_TRANSFER',
        tags: ['freelance', 'business'],
      },
    ],
  });

  // Create Initial Sample Expense Entries
  await prisma.expense.createMany({
    data: [
      {
        categoryId: housingCat.id,
        amount: 45000,
        date: today,
        description: 'Office & Housing Rent',
        paymentMethod: 'BANK_TRANSFER',
        tags: ['rent', 'fixed'],
      },
      {
        categoryId: groceriesCat.id,
        amount: 28500,
        date: today,
        description: 'Supermarket & Groceries',
        paymentMethod: 'CREDIT_CARD',
        tags: ['food', 'living'],
      },
      {
        categoryId: utilsCat.id,
        amount: 18200,
        date: today,
        description: 'Electricity & High-Speed Internet',
        paymentMethod: 'BANK_TRANSFER',
        tags: ['bills', 'utilities'],
      },
    ],
  });

  console.log('✅ Prisma seed executed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Prisma seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
