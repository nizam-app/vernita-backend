const asyncHandler = require('../../utils/async-handler');
const ApiResponse = require('../../utils/api-response');
const httpStatus = require('../../constants/http-status');
const planService = require('./plan.service');
const {
  validateCreatePlan,
  validateUpdatePlan,
  validatePlanStatusUpdate,
  validatePlanRecommendedUpdate,
  validatePlanListQuery,
} = require('./plan.validation');

const createPlan = asyncHandler(async (req, res) => {
  validateCreatePlan(req.body);

  const plan = await planService.createPlan(req.body, req.user?._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: 'Plan created successfully.',
    data: plan,
  });
});

const getPlans = asyncHandler(async (req, res) => {
  const query = validatePlanListQuery(req.query);
  const plans = await planService.getPlans(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Plans fetched successfully.',
    data: plans,
  });
});

const getPlanById = asyncHandler(async (req, res) => {
  const plan = await planService.getPlanById(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Plan fetched successfully.',
    data: plan,
  });
});

const updatePlan = asyncHandler(async (req, res) => {
  validateUpdatePlan(req.body);

  const plan = await planService.updatePlan(req.params.id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Plan updated successfully.',
    data: plan,
  });
});

const updatePlanStatus = asyncHandler(async (req, res) => {
  validatePlanStatusUpdate(req.body);

  const plan = await planService.updatePlanStatus(req.params.id, req.body.isActive);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Plan status updated successfully.',
    data: plan,
  });
});

const updatePlanRecommended = asyncHandler(async (req, res) => {
  validatePlanRecommendedUpdate(req.body);

  const plan = await planService.updatePlanRecommended(req.params.id, req.body.recommended);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Plan recommended status updated successfully.',
    data: plan,
  });
});

const deletePlan = asyncHandler(async (req, res) => {
  const plan = await planService.deletePlan(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Plan deleted successfully.',
    data: plan,
  });
});

module.exports = {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  updatePlanStatus,
  updatePlanRecommended,
  deletePlan,
};
