import AppError from "../utils/AppError.js";

export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  if (req.user.role !== "admin") {
    return next(new AppError("Forbidden. Admin access required.", 403));
  }

  next();
};
