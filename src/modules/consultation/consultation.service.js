import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { env } from "../../config/env.js";
import { sendConsultationNotification } from "../../config/mailer.js";
import { ConsultationRequest } from "./consultation.model.js";
import { validateCreateConsultation } from "./consultation.validation.js";

const sanitizeConsultation = (doc) => ({
  id: doc._id,
  fullName: doc.fullName,
  email: doc.email,
  phone: doc.phone || null,
  preferredDate: doc.preferredDate,
  preferredTime: doc.preferredTime,
  message: doc.message,
  source: doc.source,
  status: doc.status,
  meta: doc.meta,
  emailNotificationSent: doc.emailNotificationSent,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const createConsultationRequest = async (body, requestMeta = {}) => {
  const payload = validateCreateConsultation(body);

  if (payload.website) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid submission.");
  }

  const consultation = await ConsultationRequest.create({
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone || "",
    preferredDate: new Date(payload.preferredDate),
    preferredTime: payload.preferredTime,
    message: payload.message,
    source: payload.source || env.CONSULTATION_DEFAULT_SOURCE,
    meta: {
      ip: requestMeta.ip || "",
      userAgent: requestMeta.userAgent || "",
      referer: requestMeta.referer || "",
    },
  });

  let emailNotificationSent = false;
  try {
    const mailResult = await sendConsultationNotification({
      consultation,
      requestMeta,
    });
    emailNotificationSent = Boolean(mailResult?.sent);
    if (emailNotificationSent) {
      consultation.emailNotificationSent = true;
      await consultation.save();
    }
  } catch (err) {
    console.error("[consultation] Email notification failed:", err.message);
  }

  return sanitizeConsultation(consultation);
};

export const listConsultationRequests = async (query = {}) => {
  const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit || "20"), 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status) filter.status = String(query.status).trim();
  if (query.source) filter.source = String(query.source).trim();

  const [total, items] = await Promise.all([
    ConsultationRequest.countDocuments(filter),
    ConsultationRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  return {
    items: items.map(sanitizeConsultation),
    meta: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
  };
};

export const getConsultationRequestById = async (id) => {
  const doc = await ConsultationRequest.findById(id);
  if (!doc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Consultation request not found.");
  }
  return sanitizeConsultation(doc);
};
