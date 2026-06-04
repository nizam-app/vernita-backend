import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

projectSchema.index({ name: 1 });

export const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);
