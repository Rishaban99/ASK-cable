import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMongoDates() {
  console.log("Fixing MongoDB invalid createdAt fields...");

  try {
    // Run MongoDB raw commands to update string dates to BSON Date or drop invalid collections
    await prisma.$runCommandRaw({
      update: "categories",
      updates: [
        {
          q: { createdAt: { $type: "string" } },
          u: [{ $set: { createdAt: { $toDate: "$createdAt" } } }],
          multi: true
        }
      ]
    });
    console.log("Converted category string createdAt fields to BSON Date.");
  } catch (err) {
    console.log("Error updating categories, attempting collection cleanup:", err);
  }

  try {
    await prisma.$runCommandRaw({
      update: "incomes",
      updates: [
        {
          q: { createdAt: { $type: "string" } },
          u: [{ $set: { createdAt: { $toDate: "$createdAt" } } }],
          multi: true
        }
      ]
    });
    console.log("Converted incomes string createdAt fields to BSON Date.");
  } catch (err) {
    console.log("Error updating incomes:", err);
  }

  try {
    await prisma.$runCommandRaw({
      update: "expenses",
      updates: [
        {
          q: { createdAt: { $type: "string" } },
          u: [{ $set: { createdAt: { $toDate: "$createdAt" } } }],
          multi: true
        }
      ]
    });
    console.log("Converted expenses string createdAt fields to BSON Date.");
  } catch (err) {
    console.log("Error updating expenses:", err);
  }

  await prisma.$disconnect();
}

fixMongoDates().catch(async (e) => {
  console.error("Migration failed:", e);
  await prisma.$disconnect();
});
