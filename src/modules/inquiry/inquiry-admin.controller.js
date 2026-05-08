import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import ApiError from "../../utils/api-error.js";
import { Inquiry } from "./inquiry.model.js";

const ensureMongoId = (value, fieldName = "id") => {
  if (!value || typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid id.`);
  }
};

const toPositiveInt = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const adminListInquiries = catchAsync(async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;

  const filter = {};
  const [total, items] = await Promise.all([
    Inquiry.countDocuments(filter),
    Inquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Inquiries fetched successfully.",
    data: items.map((i) => ({
      id: i._id,
      fullName: i.fullName,
      email: i.email,
      phoneNumber: i.phoneNumber,
      serviceInterestedIn: i.serviceInterestedIn,
      message: i.message,
      source: i.source,
      meta: i.meta,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  });
});

export const adminGetInquiryById = catchAsync(async (req, res) => {
  ensureMongoId(req.params.id, "id");

  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Inquiry not found.");
  }

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Inquiry fetched successfully.",
    data: {
      id: inquiry._id,
      fullName: inquiry.fullName,
      email: inquiry.email,
      phoneNumber: inquiry.phoneNumber,
      serviceInterestedIn: inquiry.serviceInterestedIn,
      message: inquiry.message,
      source: inquiry.source,
      meta: inquiry.meta,
      createdAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt,
    },
  });
});

