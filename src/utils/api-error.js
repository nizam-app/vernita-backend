import AppError from "./AppError.js";

export default class ApiError extends AppError {
  constructor(statusCode, message) {
    super(message, statusCode);
  }
}
