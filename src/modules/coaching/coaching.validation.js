import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { z } from "zod";
import {
  COACHING_ACCESS_TYPES,
  COACHING_PACKAGE_STATUSES,
} from "./coaching.constants.js";

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

const nonEmptyTrimmedString = (fieldName, max = 2000) =>
  z
    .string({ required_error: `${fieldName} is required.` })
    .trim()
    .min(1, `${fieldName} is required.`)
    .max(max, `${fieldName} is too long.`);

const optionalTrimmedString = (fieldName, max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `${fieldName} is too long.`)
    .optional();

const optionalStringArray = (fieldName, maxItems = 200) =>
  z
    .array(z.string().trim().min(1, `${fieldName} items must be non-empty.`))
    .max(maxItems, `${fieldName} has too many items.`)
    .optional();

const createCoachingPackageSchema = z
  .object({
    title: nonEmptyTrimmedString("title", 200),
    slug: optionalTrimmedString("slug", 160),
    shortDescription: optionalTrimmedString("shortDescription", 500),
    description: optionalTrimmedString("description", 10000),
    thumbnail: optionalTrimmedString("thumbnail", 500),
    bannerImage: optionalTrimmedString("bannerImage", 500),
    category: optionalTrimmedString("category", 120),
    coachName: optionalTrimmedString("coachName", 160),
    coachTitle: optionalTrimmedString("coachTitle", 160),
    coachBio: optionalTrimmedString("coachBio", 2000),
    durationText: nonEmptyTrimmedString("durationText", 120),
    durationInDays: z.number().int().nonnegative().optional(),
    price: z.number().nonnegative().optional(),
    currency: optionalTrimmedString("currency", 10),
    benefits: optionalStringArray("benefits"),
    features: optionalStringArray("features"),
    includesSessionsCount: z.number().int().nonnegative().optional(),
    accessType: z.enum(COACHING_ACCESS_TYPES).optional(),
    isFeatured: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    status: z.enum(COACHING_PACKAGE_STATUSES).optional(),
  })
  .strict();

const updateCoachingPackageSchema = createCoachingPackageSchema
  .partial()
  .refine((obj) => Object.keys(obj || {}).length > 0, {
    message: "At least one field is required for update.",
  });

const toggleSchema = z
  .object({ value: z.boolean({ required_error: "value is required." }) })
  .strict();

const adminListSchema = z
  .object({
    category: z.string().trim().optional(),
    accessType: z.enum(COACHING_ACCESS_TYPES).optional(),
    isPublished: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
    isFeatured: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
    status: z.enum(COACHING_PACKAGE_STATUSES).optional(),
    search: z.string().trim().optional(),
    page: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .refine((v) => v === undefined || (Number.isInteger(v) && v >= 1), {
        message: "page must be a positive integer.",
      }),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .refine((v) => v === undefined || (Number.isInteger(v) && v >= 1), {
        message: "limit must be a positive integer.",
      }),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(["asc", "desc", "1", "-1"]).optional(),
  })
  .passthrough();

const userListSchema = z
  .object({
    category: z.string().trim().optional(),
    accessType: z.enum(COACHING_ACCESS_TYPES).optional(),
    search: z.string().trim().optional(),
    page: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .refine((v) => v === undefined || (Number.isInteger(v) && v >= 1), {
        message: "page must be a positive integer.",
      }),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .refine((v) => v === undefined || (Number.isInteger(v) && v >= 1), {
        message: "limit must be a positive integer.",
      }),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(["asc", "desc", "1", "-1"]).optional(),
  })
  .passthrough();

const idParamSchema = z
  .object({
    id: z.string().regex(objectIdRegex, "Invalid id."),
  })
  .strict();

const purchaseIdParamSchema = z
  .object({
    purchaseId: z.string().regex(objectIdRegex, "Invalid purchaseId."),
  })
  .strict();

const scheduleSessionSchema = z
  .object({
    scheduledAt: z
      .string({ required_error: "scheduledAt is required." })
      .transform((v) => new Date(v))
      .refine((d) => !Number.isNaN(d.getTime()), {
        message: "scheduledAt must be a valid date.",
      }),
    durationMinutes: z
      .number()
      .int()
      .min(1, "durationMinutes must be at least 1.")
      .optional(),
    meetingLink: optionalTrimmedString("meetingLink", 500),
    notes: optionalTrimmedString("notes", 2000),
  })
  .strict();

export const validateCreateCoachingPackage = (body) =>
  parseWith(createCoachingPackageSchema, body);

export const validateUpdateCoachingPackage = (body) =>
  parseWith(updateCoachingPackageSchema, body);

export const validateTogglePayload = (body) => parseWith(toggleSchema, body);

export const validateAdminPackageListQuery = (query) =>
  parseWith(adminListSchema, query);

export const validateUserPackageListQuery = (query) =>
  parseWith(userListSchema, query);

export const validateIdParam = (params) => parseWith(idParamSchema, params);

export const validatePurchaseIdParam = (params) =>
  parseWith(purchaseIdParamSchema, params);

export const validateScheduleSession = (body) =>
  parseWith(scheduleSessionSchema, body);

