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

const inquiryCreateSchema = z
  .object({
    fullName: nonEmpty("fullName", 200),
    email: nonEmpty("email", 320).email("email must be a valid email."),
    phoneNumber: nonEmpty("phoneNumber", 50),
    serviceInterestedIn: nonEmpty("serviceInterestedIn", 160),
    message: nonEmpty("message", 5000),
    source: z.string().trim().max(120).optional(),
    // honeypot field: should be empty
    website: z.string().trim().max(200).optional(),
  })
  .strict();

export const validateCreateInquiry = (body) => parseWith(inquiryCreateSchema, body);

