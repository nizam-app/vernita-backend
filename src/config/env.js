// src/config/env.js

import dotenv from "dotenv";

dotenv.config();

// required(key): env না থাকলে error throw করবে
const required = (key) => {
  if (!process.env[key]) throw new Error(`Missing env: ${key}`);

  return process.env[key];
};

const resolveMongoUrl = () => {
  const url = process.env.MONGODB_URL || process.env.MONGODB_URI;
  if (!url) {
    throw new Error("Missing env: MONGODB_URL (or MONGODB_URI)");
  }
  return url.trim();
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  HOST: (process.env.HOST || "0.0.0.0").trim(),
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URL: resolveMongoUrl(),
  JWT_SECRET: required("JWT_SECRET"),
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  CONSULTATION_DEFAULT_SOURCE: process.env.CONSULTATION_DEFAULT_SOURCE || "website-2",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "",
  CONSULTATION_NOTIFY_TO: process.env.CONSULTATION_NOTIFY_TO || "",
};
