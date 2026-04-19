// src/config/env.js

import dotenv from "dotenv";

dotenv.config();

// required(key): env না থাকলে error throw করবে
const required = (key) => {
  if (!process.env[key]) throw new Error(`Missing env: ${key}`);

  return process.env[key];
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URL: required("MONGODB_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  JWT_EXPIRES_IN: Number(process.env.JWT_EXPIRES_IN) || "7d"
};
