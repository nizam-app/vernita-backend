/**
 * One-off: activate a user by email. Usage:
 *   node scripts/activate-user-by-email.js admin15@gmail.com
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/activate-user-by-email.js <email>");
  process.exit(1);
}

const { User } = await import("../src/modules/user/user.model.js");

await mongoose.connect(process.env.MONGODB_URL);
const user = await User.findOneAndUpdate(
  { email },
  { $set: { isActive: true, isBlocked: false } },
  { new: true },
);

if (!user) {
  console.error(`No user found for ${email}`);
  process.exit(1);
}

console.log(`Activated: ${user.email} (isActive=${user.isActive}, isBlocked=${user.isBlocked})`);
await mongoose.disconnect();
