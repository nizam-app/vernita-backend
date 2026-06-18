import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { deleteImage } from "../../services/upload.service.js";
import { CoachingPackage } from "./coachingPackage.model.js";
import { CoachingPurchase } from "./coachingPurchase.model.js";
import { CoachingSession } from "./coachingSession.model.js";
import getStripeClient from "../../config/stripe.js";
import Order from "../order/order.model.js";
import {
  COACHING_ACCESS_TYPES,
  COACHING_PACKAGE_STATUSES,
  COACHING_PAYMENT_STATUSES,
  COACHING_PURCHASE_STATUSES,
} from "./coaching.constants.js";

const ALLOWED_SORT_FIELDS = [
  "title",
  "price",
  "category",
  "isFeatured",
  "isPublished",
  "status",
  "createdAt",
  "updatedAt",
];

const toSortOrder = (sortOrder) =>
  sortOrder === "desc" || sortOrder === "-1" ? -1 : 1;

const normalizeCurrency = (currency) =>
  currency ? String(currency).trim().toUpperCase() : undefined;

const ensureStringArray = (arr) => {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) return undefined;
  return arr
    .map((v) => String(v).trim())
    .filter(Boolean);
};

const sanitizePackage = (pkg) => ({
  id: pkg._id,
  title: pkg.title,
  slug: pkg.slug,
  shortDescription: pkg.shortDescription,
  description: pkg.description,
  thumbnail: pkg.thumbnail,
  bannerImage: pkg.bannerImage,
  category: pkg.category,
  coachName: pkg.coachName,
  coachTitle: pkg.coachTitle,
  coachBio: pkg.coachBio,
  durationText: pkg.durationText,
  durationInDays: pkg.durationInDays,
  price: pkg.price,
  currency: pkg.currency,
  isFree: pkg.isFree,
  benefits: pkg.benefits,
  features: pkg.features,
  includesSessionsCount: pkg.includesSessionsCount,
  accessType: pkg.accessType,
  isFeatured: pkg.isFeatured,
  isPublished: pkg.isPublished,
  status: pkg.status,
  createdBy: pkg.createdBy,
  updatedBy: pkg.updatedBy,
  createdAt: pkg.createdAt,
  updatedAt: pkg.updatedAt,
});

const sanitizePurchase = (purchase) => ({
  id: purchase._id,
  userId: purchase.userId,
  coachingPackageId: purchase.coachingPackageId,
  paymentStatus: purchase.paymentStatus,
  purchaseStatus: purchase.purchaseStatus,
  accessType: purchase.accessType,
  orderId: purchase.orderId,
  checkoutSessionId: purchase.checkoutSessionId,
  paymentIntentId: purchase.paymentIntentId,
  stripeCustomerId: purchase.stripeCustomerId,
  paidAt: purchase.paidAt,
  purchasedAt: purchase.purchasedAt,
  startsAt: purchase.startsAt,
  endsAt: purchase.endsAt,
  notes: purchase.notes,
  createdAt: purchase.createdAt,
  updatedAt: purchase.updatedAt,
});

const getCheckoutBaseUrl = () => {
  return (
    process.env.CLIENT_URL ||
    `http://${process.env.HOST || "localhost"}:${process.env.PORT || 5000}`
  );
};

const getStripeLineItemForPackage = (pkg) => {
  const unitAmount = Math.round(Number(pkg.price || 0) * 100);
  return {
    price_data: {
      currency: String(pkg.currency || "USD").toLowerCase(),
      product_data: {
        name: pkg.title,
        description: pkg.shortDescription || undefined,
      },
      unit_amount: unitAmount,
    },
    quantity: 1,
  };
};

const createCoachingOrder = async ({ userId, pkg, purchase }) => {
  return Order.create({
    itemType: "coaching",
    userId,
    orderType: "coaching_purchase",
    paymentProvider: "stripe",
    amount: Number(pkg.price || 0),
    currency: String(pkg.currency || "USD").toUpperCase(),
    status: "pending",
    itemSnapshot: {
      title: pkg.title,
      description: pkg.shortDescription || "",
      price: Number(pkg.price || 0),
      currency: String(pkg.currency || "USD").toUpperCase(),
      itemType: "coaching",
    },
    metadata: {
      purchaseId: String(purchase._id),
      coachingPackageId: String(pkg._id),
      userId: String(userId),
    },
  });
};

const createStripeCheckoutSessionForCoaching = async ({ userId, pkg, order, purchase }) => {
  const stripe = getStripeClient();
  const baseUrl = getCheckoutBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [getStripeLineItemForPackage(pkg)],
    customer_email: undefined,
    success_url: `${baseUrl}/payment/success?itemType=coaching&purchaseId=${purchase._id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/payment/cancel?itemType=coaching&purchaseId=${purchase._id}`,
    metadata: {
      itemType: "coaching",
      orderId: String(order._id),
      purchaseId: String(purchase._id),
      coachingPackageId: String(pkg._id),
      userId: String(userId),
    },
  });

  order.checkoutSessionId = session.id;
  await order.save();

  purchase.checkoutSessionId = session.id;
  purchase.orderId = String(order._id);
  await purchase.save();

  return session;
};

const ensurePackageExists = async (packageId, { allowUnpublished = true } = {}) => {
  const filter = { _id: packageId, isDeleted: false };
  if (!allowUnpublished) {
    filter.isPublished = true;
    filter.status = "published";
  }

  const pkg = await CoachingPackage.findOne(filter);
  if (!pkg) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coaching package not found.");
  }
  return pkg;
};

const normalizePackagePayload = (payload) => {
  const normalized = { ...payload };

  if (normalized.title !== undefined) normalized.title = normalized.title.trim();
  if (normalized.slug !== undefined) normalized.slug = normalized.slug.trim().toLowerCase();
  if (normalized.shortDescription !== undefined) normalized.shortDescription = normalized.shortDescription.trim();
  if (normalized.description !== undefined) normalized.description = normalized.description.trim();
  if (normalized.thumbnail !== undefined) normalized.thumbnail = normalized.thumbnail.trim();
  if (normalized.bannerImage !== undefined) normalized.bannerImage = normalized.bannerImage.trim();
  if (normalized.category !== undefined) normalized.category = normalized.category.trim();
  if (normalized.coachName !== undefined) normalized.coachName = normalized.coachName.trim();
  if (normalized.coachTitle !== undefined) normalized.coachTitle = normalized.coachTitle.trim();
  if (normalized.coachBio !== undefined) normalized.coachBio = normalized.coachBio.trim();
  if (normalized.durationText !== undefined) normalized.durationText = normalized.durationText.trim();
  if (normalized.currency !== undefined) normalized.currency = normalizeCurrency(normalized.currency);
  if (normalized.thumbnailPublicId !== undefined) {
    normalized.thumbnailPublicId = String(normalized.thumbnailPublicId || "").trim();
  }
  if (normalized.bannerImagePublicId !== undefined) {
    normalized.bannerImagePublicId = String(normalized.bannerImagePublicId || "").trim();
  }

  if (normalized.benefits !== undefined) normalized.benefits = ensureStringArray(normalized.benefits);
  if (normalized.features !== undefined) normalized.features = ensureStringArray(normalized.features);

  if (normalized.price !== undefined) {
    const price = Number(normalized.price);
    normalized.price = Number.isFinite(price) ? price : 0;
  }

  if (normalized.accessType !== undefined && !COACHING_ACCESS_TYPES.includes(normalized.accessType)) {
    delete normalized.accessType;
  }

  if (normalized.status !== undefined && !COACHING_PACKAGE_STATUSES.includes(normalized.status)) {
    delete normalized.status;
  }

  if (normalized.isPublished !== undefined && typeof normalized.isPublished !== "boolean") {
    delete normalized.isPublished;
  }

  if (normalized.isFeatured !== undefined && typeof normalized.isFeatured !== "boolean") {
    delete normalized.isFeatured;
  }

  return normalized;
};

// Admin
export const createCoachingPackage = async (payload, adminUserId) => {
  const normalizedPayload = normalizePackagePayload(payload);
  const pkg = await CoachingPackage.create({
    ...normalizedPayload,
    createdBy: adminUserId || null,
    updatedBy: adminUserId || null,
  });
  return sanitizePackage(pkg);
};

export const getAdminCoachingPackages = async (query) => {
  const filter = { isDeleted: false };

  if (query.category) filter.category = query.category;
  if (query.accessType) filter.accessType = query.accessType;
  if (query.isPublished !== undefined) filter.isPublished = query.isPublished;
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured;
  if (query.status) filter.status = query.status;

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { shortDescription: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { coachName: { $regex: query.search, $options: "i" } },
    ];
  }

  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : "createdAt";
  const sortOrder = toSortOrder(query.sortOrder || "desc");
  const sort = { [sortBy]: sortOrder, createdAt: -1 };

  const [total, items] = await Promise.all([
    CoachingPackage.countDocuments(filter),
    CoachingPackage.find(filter).sort(sort).skip(skip).limit(limit),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data: items.map(sanitizePackage),
  };
};

export const getAdminCoachingPackageById = async (packageId) => {
  const pkg = await ensurePackageExists(packageId, { allowUnpublished: true });
  return sanitizePackage(pkg);
};

export const updateAdminCoachingPackage = async (packageId, payload, adminUserId) => {
  const pkg = await ensurePackageExists(packageId, { allowUnpublished: true });
  const normalizedPayload = normalizePackagePayload(payload);

  Object.assign(pkg, normalizedPayload, { updatedBy: adminUserId || null });
  await pkg.save();

  return sanitizePackage(pkg);
};

export const updateAdminCoachingPackageWithFiles = async (
  packageId,
  payload,
  files,
  adminUserId
) => {
  const pkg = await ensurePackageExists(packageId, { allowUnpublished: true });

  const thumbFile = files?.thumbnail?.[0] || files?.thumbnailUrl?.[0] || null;
  const bannerFile = files?.bannerImage?.[0] || files?.bannerImageUrl?.[0] || null;

  if (thumbFile && pkg.thumbnailPublicId) await deleteImage(pkg.thumbnailPublicId);
  if (bannerFile && pkg.bannerImagePublicId) await deleteImage(pkg.bannerImagePublicId);

  return updateAdminCoachingPackage(packageId, payload, adminUserId);
};

export const softDeleteAdminCoachingPackage = async (packageId, adminUserId) => {
  const pkg = await ensurePackageExists(packageId, { allowUnpublished: true });
  pkg.isDeleted = true;
  pkg.deletedAt = new Date();
  pkg.isPublished = false;
  pkg.isFeatured = false;
  pkg.status = "archived";
  pkg.updatedBy = adminUserId || null;
  await pkg.save();
  return sanitizePackage(pkg);
};

export const toggleAdminCoachingPackagePublish = async (packageId, publish, adminUserId) => {
  const pkg = await ensurePackageExists(packageId, { allowUnpublished: true });
  pkg.isPublished = publish;
  pkg.status = publish ? "published" : "draft";
  pkg.updatedBy = adminUserId || null;
  await pkg.save();
  return sanitizePackage(pkg);
};

export const toggleAdminCoachingPackageFeatured = async (packageId, featured, adminUserId) => {
  const pkg = await ensurePackageExists(packageId, { allowUnpublished: true });
  pkg.isFeatured = featured;
  pkg.updatedBy = adminUserId || null;
  await pkg.save();
  return sanitizePackage(pkg);
};

export const getAdminPackagePurchases = async (packageId, query = {}) => {
  await ensurePackageExists(packageId, { allowUnpublished: true });

  const filter = { coachingPackageId: packageId };
  if (query.paymentStatus && COACHING_PAYMENT_STATUSES.includes(query.paymentStatus)) {
    filter.paymentStatus = query.paymentStatus;
  }
  if (query.purchaseStatus && COACHING_PURCHASE_STATUSES.includes(query.purchaseStatus)) {
    filter.purchaseStatus = query.purchaseStatus;
  }

  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 200);
  const skip = (page - 1) * limit;

  const [total, purchases] = await Promise.all([
    CoachingPurchase.countDocuments(filter),
    CoachingPurchase.find(filter)
      .sort({ purchasedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email role"),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    data: purchases.map((p) => ({
      ...sanitizePurchase(p),
      user: p.userId,
    })),
  };
};

// User
export const getPublishedCoachingPackages = async (query) => {
  const filter = {
    isDeleted: false,
    isPublished: true,
    status: "published",
  };

  if (query.category) filter.category = query.category;
  if (query.accessType) filter.accessType = query.accessType;

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { shortDescription: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { coachName: { $regex: query.search, $options: "i" } },
    ];
  }

  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : "createdAt";
  const sortOrder = toSortOrder(query.sortOrder || "desc");
  const sort = { [sortBy]: sortOrder, createdAt: -1 };

  const [total, items] = await Promise.all([
    CoachingPackage.countDocuments(filter),
    CoachingPackage.find(filter).sort(sort).skip(skip).limit(limit),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    data: items.map(sanitizePackage),
  };
};

export const getFeaturedCoachingPackages = async () => {
  const items = await CoachingPackage.find({
    isDeleted: false,
    isPublished: true,
    status: "published",
    isFeatured: true,
  }).sort({ createdAt: -1 });

  return items.map(sanitizePackage);
};

export const getPublishedCoachingPackageById = async (packageId) => {
  const pkg = await ensurePackageExists(packageId, { allowUnpublished: false });
  return sanitizePackage(pkg);
};

export const purchaseCoachingPackage = async (userId, packageId) => {
  const pkg = await ensurePackageExists(packageId, { allowUnpublished: false });

  const existing = await CoachingPurchase.findOne({
    userId,
    coachingPackageId: pkg._id,
    purchaseStatus: { $ne: "canceled" },
  }).sort({ purchasedAt: -1 });

  if (existing && existing.purchaseStatus === "active") {
    if (existing.paymentStatus === "paid" || existing.paymentStatus === "free") {
      return {
        purchase: sanitizePurchase(existing),
        package: sanitizePackage(pkg),
        alreadyOwned: true,
        requiresPayment: false,
        checkoutUrl: null,
      };
    }

    let order = existing.orderId ? await Order.findById(existing.orderId) : null;
    if (!order || order.status !== "pending") {
      order = await createCoachingOrder({ userId, pkg, purchase: existing });
    }

    const session = await createStripeCheckoutSessionForCoaching({
      userId,
      pkg,
      order,
      purchase: existing,
    });

    return {
      purchase: sanitizePurchase(existing),
      package: sanitizePackage(pkg),
      alreadyOwned: true,
      requiresPayment: true,
      checkoutUrl: session.url || null,
      checkoutSessionId: session.id,
      orderId: String(order._id),
    };
  }

  const isFree = pkg.accessType === "free" || pkg.isFree || pkg.price <= 0;
  const paymentStatus = isFree ? "free" : "pending";

  const purchase = await CoachingPurchase.create({
    userId,
    coachingPackageId: pkg._id,
    accessType: isFree ? "free" : "paid",
    paymentStatus,
    purchaseStatus: "active",
    purchasedAt: new Date(),
    startsAt: new Date(),
    endsAt:
      pkg.durationInDays && Number(pkg.durationInDays) > 0
        ? new Date(Date.now() + Number(pkg.durationInDays) * 24 * 60 * 60 * 1000)
        : null,
  });

  if (isFree) {
    return {
      purchase: sanitizePurchase(purchase),
      package: sanitizePackage(pkg),
      alreadyOwned: false,
      requiresPayment: false,
      checkoutUrl: null,
    };
  }

  const order = await createCoachingOrder({ userId, pkg, purchase });
  const session = await createStripeCheckoutSessionForCoaching({ userId, pkg, order, purchase });

  return {
    purchase: sanitizePurchase(purchase),
    package: sanitizePackage(pkg),
    alreadyOwned: false,
    requiresPayment: true,
    checkoutUrl: session.url || null,
    checkoutSessionId: session.id,
    orderId: String(order._id),
  };
};

export const getMyCoaching = async (userId) => {
  const purchases = await CoachingPurchase.find({ userId })
    .sort({ purchasedAt: -1 })
    .populate("coachingPackageId");

  return purchases
    .filter((p) => p.coachingPackageId && !p.coachingPackageId.isDeleted)
    .map((p) => ({
      ...sanitizePurchase(p),
      package: sanitizePackage(p.coachingPackageId),
    }));
};

export const getMyCoachingByPurchaseId = async (userId, purchaseId) => {
  const purchase = await CoachingPurchase.findOne({ _id: purchaseId, userId }).populate(
    "coachingPackageId"
  );

  if (!purchase) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coaching purchase not found.");
  }

  if (!purchase.coachingPackageId || purchase.coachingPackageId.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coaching package not found.");
  }

  return {
    ...sanitizePurchase(purchase),
    package: sanitizePackage(purchase.coachingPackageId),
  };
};

export const scheduleMyCoachingSession = async (userId, purchaseId, payload) => {
  const purchase = await CoachingPurchase.findOne({ _id: purchaseId, userId });
  if (!purchase) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coaching purchase not found.");
  }

  if (purchase.purchaseStatus !== "active") {
    throw new ApiError(httpStatus.BAD_REQUEST, "This coaching purchase is not active.");
  }

  const session = await CoachingSession.create({
    userId,
    coachingPackageId: purchase.coachingPackageId,
    purchaseId: purchase._id,
    scheduledAt: payload.scheduledAt,
    durationMinutes: payload.durationMinutes ?? 30,
    meetingLink: payload.meetingLink || "",
    notes: payload.notes || "",
  });

  return {
    id: session._id,
    userId: session.userId,
    coachingPackageId: session.coachingPackageId,
    purchaseId: session.purchaseId,
    coachName: session.coachName,
    scheduledAt: session.scheduledAt,
    durationMinutes: session.durationMinutes,
    meetingLink: session.meetingLink,
    sessionStatus: session.sessionStatus,
    notes: session.notes,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
};

export const getMyCoachingSessions = async (userId, purchaseId) => {
  const purchase = await CoachingPurchase.findOne({ _id: purchaseId, userId });
  if (!purchase) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coaching purchase not found.");
  }

  const sessions = await CoachingSession.find({
    userId,
    purchaseId: purchase._id,
  }).sort({ scheduledAt: -1 });

  return sessions.map((s) => ({
    id: s._id,
    userId: s.userId,
    coachingPackageId: s.coachingPackageId,
    purchaseId: s.purchaseId,
    coachName: s.coachName,
    scheduledAt: s.scheduledAt,
    durationMinutes: s.durationMinutes,
    meetingLink: s.meetingLink,
    sessionStatus: s.sessionStatus,
    notes: s.notes,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
};

// Stripe webhook handler for coaching purchases
export const handleCoachingStripeWebhook = async (event) => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session?.metadata?.orderId;
      const purchaseId = session?.metadata?.purchaseId;
      if (!orderId || !purchaseId) return { received: true };

      const order = await Order.findById(orderId);
      const purchase = await CoachingPurchase.findById(purchaseId);
      if (!order || !purchase) return { received: true };

      if (order.status !== "paid") {
        order.status = "paid";
        order.paymentIntentId = session.payment_intent || null;
        order.stripeCustomerId = session.customer || null;
        order.stripeEventId = event.id;
        order.paidAt = order.paidAt || new Date();
        await order.save();
      }

      if (purchase.paymentStatus !== "paid" && purchase.paymentStatus !== "free") {
        purchase.paymentStatus = "paid";
        purchase.paymentIntentId = session.payment_intent || null;
        purchase.stripeCustomerId = session.customer || null;
        purchase.paidAt = purchase.paidAt || new Date();
        purchase.orderId = String(order._id);
        purchase.checkoutSessionId = session.id;
        await purchase.save();
      }

      return { received: true };
    }
    case "checkout.session.expired": {
      const session = event.data.object;
      const purchaseId = session?.metadata?.purchaseId;
      if (!purchaseId) return { received: true };
      const purchase = await CoachingPurchase.findById(purchaseId);
      if (purchase && purchase.paymentStatus === "pending") {
        purchase.paymentStatus = "failed";
        purchase.purchaseStatus = "canceled";
        await purchase.save();
      }

      const order = await Order.findOne({ checkoutSessionId: session.id, itemType: "coaching" });
      if (order && order.status === "pending") {
        order.status = "canceled";
        order.canceledAt = new Date();
        order.stripeEventId = event.id;
        await order.save();
      }

      return { received: true };
    }
    default:
      return { received: true };
  }
};

