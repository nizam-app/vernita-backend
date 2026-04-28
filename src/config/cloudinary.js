import { v2 as cloudinary } from "cloudinary";

let configured = false;

const ensure = (key) => {
  if (!process.env[key]) throw new Error(`Missing env: ${key}`);
  return process.env[key];
};

export const requireCloudinary = () => {
  if (!configured) {
    cloudinary.config({
      cloud_name: ensure("CLOUDINARY_CLOUD_NAME"),
      api_key: ensure("CLOUDINARY_API_KEY"),
      api_secret: ensure("CLOUDINARY_API_SECRET"),
    });
    configured = true;
  }

  return cloudinary;
};

export default cloudinary;

