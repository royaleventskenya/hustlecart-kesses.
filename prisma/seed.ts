// Seed script for HustleCart Kesses.
// Creates ONLY the category taxonomy — no demo users, shops, products or orders.
// Real users (shoppers + vendors) sign up via the app and create their own data.
//
// Run with: bun run prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const categories = [
  { name: "Groceries", slug: "groceries" },
  { name: "Household", slug: "household" },
  { name: "Fresh Produce", slug: "fresh-produce" },
  { name: "Drinks", slug: "drinks" },
  { name: "Personal Care", slug: "personal-care" },
  { name: "Snacks", slug: "snacks" },
  { name: "Bakery", slug: "bakery" },
];

async function main() {
  console.log("Clearing existing data...");
  // Order matters: respect FK constraints.
  await db.statusEvent.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.sourceShop.deleteMany();
  await db.user.deleteMany();
  await db.category.deleteMany();

  console.log("Creating category taxonomy...");
  for (const c of categories) {
    await db.category.create({ data: c });
    console.log(`  - ${c.name}`);
  }

  console.log("\nSeed complete. The app starts empty — users sign up and create their own shops, products and orders.");
  console.log(`  Categories: ${await db.category.count()}`);
  console.log(`  Users:      ${await db.user.count()}`);
  console.log(`  SourceShop: ${await db.sourceShop.count()}`);
  console.log(`  Products:   ${await db.product.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
