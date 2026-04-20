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

export const getUsers = async () => {
  const users = await User.find().sort({ createdAt: -1 });

  return users.map(sanitizeUser);
};

export const updateUserById = async (userId, payload) => {
  const updates = {};

  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.email !== undefined) {
    updates.email = payload.email ? String(payload.email).trim().toLowerCase() : null;
  }
  if (payload.phone !== undefined) {
    updates.phone = payload.phone ? String(payload.phone).trim() : null;
  }
  if (payload.role !== undefined) updates.role = payload.role;
  if (payload.isActive !== undefined) updates.isActive = payload.isActive;
  if (payload.isBlocked !== undefined) updates.isBlocked = payload.isBlocked;

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return sanitizeUser(user);
};

export const deleteUserById = async (userId) => {
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return sanitizeUser(user);
};
