/**
 * Seed buyer Level Up plans (idempotent by plan name).
 * Run: node src/scripts/seed-level-up-plans.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Plan } from "../modules/plan/plan.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

const LEVEL_UP_PLANS = [
  {
    name: "Level Up Essentials",
    description: "Get clarity and create your initial action plan.",
    price: 49,
    billingCycle: "one_time",
    sortOrder: 1,
    features: [
      "Access to 1 Course",
      "Access to 1 Webinar",
      "Self-guided; no private meetings",
    ],
    entitlements: {
      maxCourses: 1,
      maxWebinars: 1,
      quotaPeriod: "lifetime",
      checkInDurationMinutes: 0,
      checkInsPerPeriod: 0,
      checkInQuotaPeriod: null,
    },
  },
  {
    name: "Level Up Momentum",
    description: "Receive ongoing coaching, mentorship, and monthly accountability.",
    price: 79,
    billingCycle: "monthly",
    sortOrder: 2,
    recommended: true,
    features: [
      "Access to 1 Course per month",
      "Access to 2 Webinars per month",
      "One 15-minute Momentum Check In per month",
    ],
    entitlements: {
      maxCourses: 1,
      maxWebinars: 2,
      quotaPeriod: "month",
      checkInDurationMinutes: 15,
      checkInsPerPeriod: 1,
      checkInQuotaPeriod: "month",
    },
  },
  {
    name: "Level Up Achievement",
    description:
      "Commit to year-round development with long-term strategy, consistent support, and measurable progress.",
    price: 999,
    billingCycle: "annual",
    sortOrder: 3,
    features: [
      "Access to 6 Courses per year",
      "Access to 12 Webinars per year",
      "One 30-minute Monthly Achievement Check In per month",
    ],
    entitlements: {
      maxCourses: 6,
      maxWebinars: 12,
      quotaPeriod: "year",
      checkInDurationMinutes: 30,
      checkInsPerPeriod: 1,
      checkInQuotaPeriod: "month",
    },
  },
];

const seed = async () => {
  if (!MONGO_URI) {
    console.error("MONGO_URI or DATABASE_URL is required.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  await Plan.updateMany(
    {
      isDeleted: false,
      name: { $nin: LEVEL_UP_PLANS.map((p) => p.name) },
    },
    { $set: { isActive: false, recommended: false } }
  );

  for (const plan of LEVEL_UP_PLANS) {
    const existing = await Plan.findOne({ name: plan.name, isDeleted: false });
    if (existing) {
      Object.assign(existing, { ...plan, isActive: true, currency: "USD" });
      await existing.save();
      console.log(`Updated plan: ${plan.name}`);
    } else {
      await Plan.create({ ...plan, isActive: true, currency: "USD" });
      console.log(`Created plan: ${plan.name}`);
    }
  }

  await mongoose.disconnect();
  console.log("Level Up plans seed complete.");
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
