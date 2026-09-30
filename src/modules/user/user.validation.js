import { z } from "zod";
import AppError from "../../utils/AppError.js";

const deleteAccountSchema = z
  .object({
    password: z.string({ required_error: "password is required." }).min(1, "password is required."),
    confirm: z.literal(true, {
      errorMap: () => ({ message: "confirm must be true to delete your account." }),
    }),
  })
  .strict();

export const validateDeleteAccount = (body) => {
  const result = deleteAccountSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues?.[0]?.message || "Validation failed.";
    throw new AppError(message, 400);
  }
  return result.data;
};
