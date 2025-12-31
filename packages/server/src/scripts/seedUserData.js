// packages/server/scripts/seedUserData.js
// One-off script to seed categories, budgets and ~80 NGN expenses for a given userId.
// Usage:
//   cd repo-root
//   # make sure packages/server/node_modules includes mongodb (install at server package if needed):
//   cd packages/server
//   pnpm add mongodb
//   # then from repo root run (example):
//   MONGO_URI="your-mongo-uri" USER_ID="64abc..." node packages/server/scripts/seedUserData.js
//
// NOTE: USER_ID should be the string _id of the user (as stored in DB). Script uses ObjectId(USER_ID).

const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI =
  "mongodb+srv://davidlana:pibjav-Xihsyx-nitfy8@clusterlana.9rmiyu2.mongodb.net/expense-tracker?retryWrites=true&w=majority&appName=ClusterLana";
const DB_NAME = "expense-tracker"; // adapt if you use a different name
const USER_ID = "695115c424ac1fc7878b85bb";

if (!USER_ID) {
  console.error(
    "ERROR: Please set USER_ID env var to the target user's _id (string)."
  );
  process.exit(1);
}

const CUSTOM_CATEGORIES = [
  { name: "Groceries", color: "var(--chart-1)" },
  { name: "Transportation", color: "var(--chart-2)" },
  { name: "Dining Out", color: "var(--chart-3)" },
  { name: "Subscriptions", color: "var(--chart-4)" },
  { name: "Healthcare", color: "var(--chart-5)" },
  { name: "Education", color: "var(--chart-6)" },
  { name: "Gifts", color: "var(--chart-7)" },
  { name: "Savings", color: "var(--chart-8)" },
];

const BUDGETS_TEMPLATE = [
  ["Groceries", 60000],
  ["Transport", 20000],
  ["Dining Out", 25000],
  ["Subscriptions", 5000],
  ["Healthcare", 15000],
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function generateExpenses(categoryNames, count = 80) {
  const descriptions = [
    "Lunch",
    "Bus fare",
    "Grocery run",
    "Pharmacy",
    "Monthly subscription",
    "Taxi",
    "Electricity bill",
    "Movie night",
    "Book purchase",
    "Coffee",
    "Gift",
    "Dinner",
    "Uber",
    "Office supplies",
    "Gym membership",
  ];

  const now = new Date();
  const start = new Date();
  start.setMonth(now.getMonth() - 5);
  start.setDate(1);

  const docs = [];
  for (let i = 0; i < count; i++) {
    const t =
      start.getTime() + Math.random() * (now.getTime() - start.getTime());
    const d = new Date(t);
    const amount = randomInt(200, 45000);
    const cat = categoryNames[randomInt(0, categoryNames.length - 1)];
    const description = `${descriptions[randomInt(0, descriptions.length - 1)]} (#${i + 1})`;
    docs.push({
      userId: new ObjectId(USER_ID),
      amount,
      currency: "NGN",
      description,
      category: cat, // server can resolve to categoryId if it exists
      categoryId: null, // optionally resolved below
      date: d,
      createdAt: new Date(),
    });
  }
  return docs;
}

(async function main() {
  console.log("Connecting to Mongo:", MONGO_URI, " DB:", DB_NAME);
  const client = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log("Connected. Using DB:", db.databaseName);

    const categoriesColl = db.collection("categories");
    const budgetsColl = db.collection("budgets");
    const expensesColl = db.collection("expenses");

    // 1) create categories (if not already present for that user)
    console.log("Ensuring custom categories (8) for user:", USER_ID);
    const createdCategories = [];
    for (const c of CUSTOM_CATEGORIES) {
      // upsert by (name + userId)
      const filter = { name: c.name, userId: new ObjectId(USER_ID) };
      const update = {
        $setOnInsert: {
          name: c.name,
          color: c.color,
          userId: new ObjectId(USER_ID),
          createdAt: new Date(),
        },
      };
      const res = await categoriesColl.findOneAndUpdate(filter, update, {
        upsert: true,
        returnDocument: "after",
      });
      const doc = res.value || (await categoriesColl.findOne(filter));
      createdCategories.push(doc);
      console.log("Category ensured:", doc.name, "id:", doc._id.toString());
    }

    const categoryNameToId = {};
    createdCategories.forEach((c) => {
      categoryNameToId[c.name] = c._id;
    });

    // 2) create budgets for a few categories (periodStart = first day of current month UTC)
    console.log("Creating budgets...");
    const today = new Date();
    const periodStartISO = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
    ).toISOString();

    for (const [catName, amount] of BUDGETS_TEMPLATE) {
      const payload = {
        userId: new ObjectId(USER_ID),
        category: catName,
        categoryId: categoryNameToId[catName] || null,
        periodStart: new Date(periodStartISO),
        amount,
        createdAt: new Date(),
      };
      // upsert to avoid duplicates
      await budgetsColl.updateOne(
        {
          userId: new ObjectId(USER_ID),
          category: catName,
          periodStart: payload.periodStart,
        },
        { $setOnInsert: payload },
        { upsert: true }
      );
      console.log(`Budget ensured for ${catName}: ${amount} NGN`);
    }

    // 3) create ~80 expenses in NGN across last 6 months
    const catNames = createdCategories.map((c) => c.name);
    const expenses = generateExpenses(catNames, 80);

    // Attempt to resolve categoryId for each expense by matching name -> ObjectId
    for (const e of expenses) {
      if (categoryNameToId[e.category]) {
        e.categoryId = categoryNameToId[e.category];
      } else {
        e.categoryId = null;
      }
    }

    console.log("Inserting expenses (80)...");
    const insertRes = await expensesColl.insertMany(expenses);
    console.log("Inserted expenses count:", insertRes.insertedCount);

    console.log("Sanity check: fetching sample expenses (limit 5) for user...");
    const sample = await expensesColl
      .find({ userId: new ObjectId(USER_ID) })
      .sort({ date: -1 })
      .limit(5)
      .toArray();
    console.log(
      "Sample rows:",
      sample.map((r) => ({
        id: r._id.toString(),
        amount: r.amount,
        date: r.date,
      }))
    );

    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(2);
  } finally {
    try {
      await client.close();
    } catch {}
  }
})();
