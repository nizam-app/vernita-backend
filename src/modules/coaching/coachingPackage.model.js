import mongoose from "mongoose";

export const COACHING_ACCESS_TYPES = ["free", "paid"];
export const COACHING_PACKAGE_STATUSES = ["draft", "published", "archived"];

const toSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 140);

const coachingPackageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required."],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 160,
      index: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    thumbnail: {
      type: String,
      trim: true,
      default: "",
    },
    bannerImage: {
      type: String,
      trim: true,
      default: "",
    },
    thumbnailPublicId: {
      type: String,
      trim: true,
      default: "",
    },
    bannerImagePublicId: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
      index: true,
    },
    coachName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    coachTitle: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    coachBio: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    durationText: {
      type: String,
      required: [true, "Duration text is required."],
      trim: true,
      maxlength: 120,
    },
    durationInDays: {
      type: Number,
      min: [0, "durationInDays cannot be negative."],
      default: null,
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative."],
      default: 0,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: "USD",
    },
    isFree: {
      type: Boolean,
      default: true,
      index: true,
    },
    benefits: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    includesSessionsCount: {
      type: Number,
      min: [0, "includesSessionsCount cannot be negative."],
      default: null,
    },
    accessType: {
      type: String,
      enum: COACHING_ACCESS_TYPES,
      default: "free",
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: COACHING_PACKAGE_STATUSES,
      default: "draft",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

coachingPackageSchema.pre("validate", function preValidate(next) {
  if (!this.slug && this.title) {
    this.slug = toSlug(this.title);
  }

  const numericPrice = typeof this.price === "number" ? this.price : 0;
  const free = !numericPrice || numericPrice <= 0;
  this.isFree = free;
  this.accessType = free ? "free" : "paid";

  // Keep status <-> isPublished consistent
  if (this.status === "published") {
    this.isPublished = true;
  } else if (this.status === "draft" || this.status === "archived") {
    this.isPublished = false;
  } else if (this.isPublished === true) {
    this.status = "published";
  } else if (this.isPublished === false && this.status === "published") {
    this.status = "draft";
  }

  next();
});

coachingPackageSchema.index({ title: 1, isDeleted: 1 });
coachingPackageSchema.index({ category: 1, isPublished: 1, isDeleted: 1 });

export const CoachingPackage =
  mongoose.models.CoachingPackage ||
  mongoose.model("CoachingPackage", coachingPackageSchema);

