import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { Plan } from "./plan.model.js";

const sanitizePlan = (plan) => ({
  id: plan._id,
  name: plan.name,
  description: plan.description,
  price: plan.price,
  currency: plan.currency,
  billingCycle: plan.billingCycle,
  features: plan.features,
  webinarDiscountPercent: plan.webinarDiscountPercent,
  recommended: plan.recommended,
  isActive: plan.isActive,
  sortOrder: plan.sortOrder,
  createdBy: plan.createdBy,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
});

const normalizePlanPayload = (payload) => {
  const normalized = { ...payload };

  if (normalized.name !== undefined) {
    normalized.name = normalized.name.trim();
  }

  if (normalized.description !== undefined) {
    normalized.description = normalized.description.trim();
  }

  if (normalized.currency !== undefined) {
    normalized.currency = normalized.currency.trim().toUpperCase();
  }

  if (normalized.features !== undefined) {
    normalized.features = normalized.features.map((feature) => feature.trim());
  }

  if (normalized.billingCycle === "free" && normalized.price === undefined) {
    normalized.price = 0;
  }

  return normalized;
};

const ensurePlanExists = async (planId) => {
  const plan = await Plan.findOne({ _id: planId, isDeleted: false });

  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, "Plan not found.");
  }

  return plan;
};

const clearRecommendedPlans = async (planIdToExclude = null) => {
  const filter = {
    isDeleted: false,
    recommended: true,
  };

  if (planIdToExclude) {
    filter._id = { $ne: planIdToExclude };
  }

  await Plan.updateMany(filter, { recommended: false });
};

const createPlan = async (payload, adminUserId) => {
  const normalizedPayload = normalizePlanPayload(payload);

  if (normalizedPayload.recommended === true) {
    await clearRecommendedPlans();
  }

  const plan = await Plan.create({
    ...normalizedPayload,
    createdBy: adminUserId || null,
  });

  return sanitizePlan(plan);
};

const getPlans = async (query) => {
  const filter = {
    isDeleted: false,
  };

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  if (query.billingCycle) {
    filter.billingCycle = query.billingCycle;
  }

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }

  const sortBy = query.sortBy || "sortOrder";
  const sortOrder = query.sortOrder || 1;

  const plans = await Plan.find(filter).sort({ [sortBy]: sortOrder, createdAt: -1 });

  return plans.map(sanitizePlan);
};

const getPlanById = async (planId) => {
  const plan = await ensurePlanExists(planId);

  return sanitizePlan(plan);
};

const updatePlan = async (planId, payload) => {
  const plan = await ensurePlanExists(planId);
  const normalizedPayload = normalizePlanPayload(payload);

  if (normalizedPayload.recommended === true) {
    await clearRecommendedPlans(plan._id);
  }

  Object.assign(plan, normalizedPayload);
  await plan.save();

  return sanitizePlan(plan);
};

const updatePlanStatus = async (planId, isActive) => {
  const plan = await ensurePlanExists(planId);

  plan.isActive = isActive;

  if (!isActive && plan.recommended) {
    plan.recommended = false;
  }

  await plan.save();

  return sanitizePlan(plan);
};

const updatePlanRecommended = async (planId, recommended) => {
  const plan = await ensurePlanExists(planId);

  if (recommended) {
    await clearRecommendedPlans(plan._id);
    plan.recommended = true;
    if (!plan.isActive) {
      plan.isActive = true;
    }
  } else {
    plan.recommended = false;
  }

  await plan.save();

  return sanitizePlan(plan);
};

const deletePlan = async (planId) => {
  const plan = await ensurePlanExists(planId);

  plan.isActive = false;
  plan.recommended = false;
  plan.isDeleted = true;
  plan.deletedAt = new Date();
  await plan.save();

  return sanitizePlan(plan);
};

export {
  sanitizePlan,
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  updatePlanStatus,
  updatePlanRecommended,
  deletePlan,
};
