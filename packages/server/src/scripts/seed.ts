// packages/server/src/scripts/seed.ts
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGO_URI || "";
if (!uri) {
  console.error("MONGO_URI not set in .env");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("expense-tracker");

    // Drop collections if they exist (start fresh)
    const existing = await db.listCollections().toArray();
    const colNames = existing.map((c) => c.name);
    for (const name of ["expenses", "categories", "budgets"]) {
      if (colNames.includes(name)) {
        console.log("Dropping collection", name);
        await db.collection(name).drop();
      }
    }

    // Collections
    const users = db.collection("users");
    const categories = db.collection("categories");
    const expenses = db.collection("expenses");
    const budgets = db.collection("budgets");

    // Indexes
    await users.createIndex({ email: 1 }, { unique: true });
    await expenses.createIndex({ userId: 1, date: -1 });
    await expenses.createIndex({ userId: 1, categoryId: 1 });
    await categories.createIndex(
      { name: 1 },
      { unique: true, collation: { locale: "en", strength: 2 } }
    );
    await budgets.createIndex(
      { userId: 1, categoryId: 1, periodStart: 1 },
      { unique: true }
    );

    // Seed global categories (userId: null)
    const defaultCats = [
      { name: "Food", color: "#f87171", userId: null, createdAt: new Date() },
      {
        name: "Transport",
        color: "#60a5fa",
        userId: null,
        createdAt: new Date(),
      },
      {
        name: "Entertainment",
        color: "#fbbf24",
        userId: null,
        createdAt: new Date(),
      },
      {
        name: "Utilities",
        color: "#34d399",
        userId: null,
        createdAt: new Date(),
      },
    ];

    const upserts = [];
    for (const c of defaultCats) {
      const r = await categories.updateOne(
        { name: c.name, userId: null },
        { $setOnInsert: c },
        { upsert: true }
      );
      upserts.push(r);
    }

    // Insert a sample user (email must be unique)
    const sampleUser = {
      name: "Demo User",
      email: "demo@example.com",
      passwordHash: "changeme",
      createdAt: new Date(),
    };
    await users.updateOne(
      { email: sampleUser.email },
      { $setOnInsert: sampleUser },
      { upsert: true }
    );

    // Find the demo user and a default category to reference
    const user = await users.findOne({ email: sampleUser.email });
    const foodCat = await categories.findOne({ name: "Food", userId: null });

    // Insert a sample expense that references categoryId
    const sampleExpense = {
      userId: user?._id ?? new ObjectId(),
      amount: 12.5,
      currency: "USD",
      description: "Lunch",
      category: foodCat?.name ?? "Food",
      categoryId: foodCat?._id ?? null,
      date: new Date(),
      createdAt: new Date(),
    };
    await expenses.insertOne(sampleExpense);

    console.log("Seed completed");
  } catch (err) {
    console.error("Seed failed", err);
  } finally {
    await client.close();
  }
}

main();
