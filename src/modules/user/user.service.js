import AppError from "../../utils/AppError.js";
import { User } from "./user.model.js";

export const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name || null,
  email: user.email || null,
  phone: user.phone || null,
  role: user.role,
  isActive: user.isActive,
  isBlocked: user.isBlocked,
  subscription: user.subscription || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return sanitizeUser(user);
};
