import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { z } from "zod";

const parseWith = (schema, payload) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const message = result.error.issues?.[0]?.message || "Validation failed.";
    throw new ApiError(httpStatus.BAD_REQUEST, message);
  }
  return result.data;
};

const nonEmpty = (field, max) =>
  z
    .string({ required_error: `${field} is required.` })
    .trim()
    .min(1, `${field} is required.`)
    .max(max, `${field} is too long.`);

const consultationCreateSchema = z
  .object({
    fullName: nonEmpty("fullName", 200),
    email: nonEmpty("email", 320).email("email must be a valid email."),
    phone: z.string().trim().max(50, "phone is too long.").optional().or(z.literal("")),
    preferredDate: z
      .string({ required_error: "preferredDate is required." })
      .trim()
      .min(1, "preferredDate is required.")
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: "preferredDate must be a valid date.",
      }),
    preferredTime: nonEmpty("preferredTime", 80),
    message: nonEmpty("message", 5000),
    source: z.string().trim().max(120).optional(),
    website: z.string().trim().max(200).optional(),
  })
  .strict();

export const validateCreateConsultation = (body) => parseWith(consultationCreateSchema, body);
