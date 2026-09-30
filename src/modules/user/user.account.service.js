import bcrypt from "bcryptjs";
import getStripeClient from "../../config/stripe.js";
import AppError from "../../utils/AppError.js";
import { CoachingPurchase } from "../coaching/coachingPurchase.model.js";
import { CoachingSession } from "../coaching/coachingSession.model.js";
import { CourseEnrollment } from "../course/course-enrollment.model.js";
import { LessonProgress } from "../course/lesson-progress.model.js";
import { Goal } from "../goal/goal.model.js";
import { Notification } from "../notification/notification.model.js";
import Order from "../order/order.model.js";
import { Task } from "../task/task.model.js";
import { BudgetSettings } from "../tracker/finance/budgetSettings.model.js";
import { FinanceTransaction } from "../tracker/finance/financeTransaction.model.js";
import { SavingsGoal } from "../tracker/finance/savingsGoal.model.js";
import { FitnessEntry } from "../tracker/fitness/fitness.model.js";
import { ReflectionEntry } from "../tracker/reflections/reflection.model.js";
import { SelfCareEntry } from "../tracker/selfCare/selfCare.model.js";
import { WebinarRegistration } from "../webinar/webinar-registration.model.js";
import { User } from "./user.model.js";

const purgeUserRelatedData = async (userId) => {
  await Promise.all([
    CourseEnrollment.deleteMany({ userId }),
    LessonProgress.deleteMany({ userId }),
    WebinarRegistration.deleteMany({ userId }),
    CoachingPurchase.deleteMany({ userId }),
    CoachingSession.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    Task.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    Order.deleteMany({ userId }),
    FinanceTransaction.deleteMany({ userId }),
    BudgetSettings.deleteMany({ userId }),
    SavingsGoal.deleteMany({ userId }),
    FitnessEntry.deleteMany({ userId }),
    SelfCareEntry.deleteMany({ userId }),
    ReflectionEntry.deleteMany({ userId }),
  ]);
};

const cancelStripeSubscriptionIfAny = async (user) => {
  const subId = user.subscription?.stripeSubscriptionId;
  if (!subId) return;
  try {
    const stripe = getStripeClient();
    await stripe.subscriptions.cancel(subId);
  } catch {
    // Proceed with account deletion even if Stripe is unreachable or already canceled.
  }
};

/**
 * Permanently deletes a user and related personal data.
 * @param {string} userId
 * @param {{ allowAdmin?: boolean }} options
 */
export const deleteUserAccount = async (userId, options = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (user.role === "admin" && !options.allowAdmin) {
    throw new AppError("Admin accounts cannot be deleted through this endpoint.", 403);
  }

  await cancelStripeSubscriptionIfAny(user);
  await purgeUserRelatedData(userId);
  await User.findByIdAndDelete(userId);

  return { id: userId, deleted: true };
};

export const deleteMyAccount = async (userId, { password }) => {
  const user = await User.findById(userId).select("+hashPassword");
  if (!user) {
    throw new AppError("Unauthorized. User not found.", 401);
  }

  if (user.role === "admin") {
    throw new AppError("Admin accounts cannot be deleted through this endpoint.", 403);
  }

  const ok = await bcrypt.compare(String(password), user.hashPassword);
  if (!ok) {
    throw new AppError("Invalid password.", 401);
  }

  return deleteUserAccount(userId);
};
