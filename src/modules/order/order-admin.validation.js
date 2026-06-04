import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;

const parseWith = (schema, payload) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const message =
      result.error.issues?.[0]?.message || "Validation failed.";
    throw new ApiError(httpStatus.BAD_REQUEST, message);
  }
  return result.data;
};

const listOrdersSchema = z
  .object({
    itemType: z.enum(["subscription", "course", "webinar", "coaching"]).optional(),
    status: z.enum(["pending", "paid", "failed", "canceled", "refunded"]).optional(),
    orderType: z.string().trim().optional(),
    paymentProvider: z.enum(["stripe", "internal", "manual"]).optional(),
    userId: z.string().regex(objectIdRegex, "Invalid userId.").optional(),
    planId: z.string().regex(objectIdRegex, "Invalid planId.").optional(),
    courseId: z.string().regex(objectIdRegex, "Invalid courseId.").optional(),
    search: z.string().trim().optional(),
    minAmount: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .refine((v) => v === undefined || Number.isFinite(v), {
        message: "minAmount must be a number.",
      }),
    maxAmount: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .refine((v) => v === undefined || Number.isFinite(v), {
        message: "maxAmount must be a number.",
      }),
    dateFrom: z
      .string()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined))
      .refine((d) => d === undefined || !Number.isNaN(d.getTime()), {
        message: "dateFrom must be a valid date.",
      }),
    dateTo: z
      .string()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined))
      .refine((d) => d === undefined || !Number.isNaN(d.getTime()), {
        message: "dateTo must be a valid date.",
      }),
    page: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : 1))
      .refine((v) => Number.isInteger(v) && v >= 1, {
        message: "page must be a positive integer.",
      }),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : 20))
      .refine((v) => Number.isInteger(v) && v >= 1, {
        message: "limit must be a positive integer.",
      }),
    sortBy: z
      .enum(["createdAt", "paidAt", "amount", "status", "itemType"])
      .optional(),
    sortOrder: z.enum(["asc", "desc", "1", "-1"]).optional(),
  })
  .passthrough();

const orderIdParamSchema = z
  .object({
    orderId: z.string().regex(objectIdRegex, "Invalid orderId."),
  })
  .strict();

const revenueSchema = z
  .object({
    itemType: z.enum(["subscription", "course", "webinar", "coaching"]).optional(),
    dateFrom: z
      .string()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined))
      .refine((d) => d === undefined || !Number.isNaN(d.getTime()), {
        message: "dateFrom must be a valid date.",
      }),
    dateTo: z
      .string()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined))
      .refine((d) => d === undefined || !Number.isNaN(d.getTime()), {
        message: "dateTo must be a valid date.",
      }),
    groupBy: z.enum(["itemType", "day", "month"]).optional(),
  })
  .passthrough();

export const validateAdminOrderListQuery = (query) => parseWith(listOrdersSchema, query);
export const validateAdminOrderIdParam = (params) => parseWith(orderIdParamSchema, params);
export const validateAdminRevenueQuery = (query) => parseWith(revenueSchema, query);

