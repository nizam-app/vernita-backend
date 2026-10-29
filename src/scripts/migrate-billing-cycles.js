/**
 * One-time migration: legacy billingCycle values → canonical enums.
 * Run: node src/scripts/migrate-billing-cycles.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Plan } from "../modules/plan/plan.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

const migrate = async () => {
  if (!MONGO_URI) {
    console.error("MONGO_URI or DATABASE_URL is required.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const premium = await Plan.updateMany(
    { billingCycle: "Premium Monthly", isDeleted: false },
    { $set: { billingCycle: "monthly" } }
  );

  const unlimited = await Plan.find({ billingCycle: "Unlimited Materials", isDeleted: false });

  for (const plan of unlimited) {
    const name = (plan.name || "").toLowerCase();
    const nextCycle =
      name.includes("achievement") || plan.price >= 500 ? "annual" : "one_time";
    plan.billingCycle = nextCycle;
    await plan.save();
    console.log(`Plan ${plan._id} (${plan.name}) → ${nextCycle}`);
  }

  console.log(`Updated Premium Monthly → monthly: ${premium.modifiedCount} plan(s).`);
  console.log(`Processed Unlimited Materials: ${unlimited.length} plan(s).`);
  await mongoose.disconnect();
};

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
