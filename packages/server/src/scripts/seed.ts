// packages/server/src/scripts/seed.ts
import "dotenv/config";
import { MongoClient } from "mongodb";

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

    // Collections
    const users = db.collection("users");
    const categories = db.collection("categories");
    const expenses = db.collection("expenses");
    const budgets = db.collection("budgets");

    // Indexes
    await users.createIndex({ email: 1 }, { unique: true });
    await expenses.createIndex({ userId: 1, date: -1 });
    await expenses.createIndex({ userId: 1, category: 1 });
    await categories.createIndex({ userId: 1 });
    await budgets.createIndex({ userId: 1, category: 1 }, { unique: true });

    // Seed categories (global defaults: userId: null)
    const defaultCats = [
      { name: "Food", color: "#f87171", userId: null },
      { name: "Transport", color: "#60a5fa", userId: null },
      { name: "Entertainment", color: "#fbbf24", userId: null },
      { name: "Utilities", color: "#34d399", userId: null },
    ];
    for (const c of defaultCats) {
      await categories.updateOne(
        { name: c.name, userId: null },
        { $setOnInsert: c },
        { upsert: true }
      );
    }

    // Insert a sample user (email must be unique)
    const sampleUser = {
      name: "Demo User",
      email: "demo@example.com",
      // password should be hashed by your auth flow, but we insert a placeholder
      passwordHash: "changeme",
      createdAt: new Date(),
    };
    await users.updateOne(
      { email: sampleUser.email },
      { $setOnInsert: sampleUser },
      { upsert: true }
    );

    // Insert a sample expense
    const user = await users.findOne({ email: sampleUser.email });
    const sampleExpense = {
      userId: user?._id,
      amount: 12.5,
      currency: "USD",
      description: "Lunch",
      category: "Food",
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
