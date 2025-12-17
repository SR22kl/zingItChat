import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFileToCloudinary = async (file) => {
  // Determine resource type: image, video, or raw (for documents)
  let resourceType = "image";
  if (file.mimetype.startsWith("video")) resourceType = "video";
  else if (
    file.mimetype.includes("pdf") ||
    file.mimetype.includes("msword") ||
    file.mimetype.includes("officedocument") ||
    file.mimetype.includes("text")
  )
    resourceType = "raw"; // store documents as raw

  const options = { resourceType };

  return new Promise((resolve, reject) => {
    // Use upload_large for videos, otherwise use upload (works for images and raw)
    const uploader =
      resourceType === "video"
        ? cloudinary.uploader.upload_large
        : cloudinary.uploader.upload;
    uploader(file.path, options, (error, result) => {
      fs.unlink(file.path, () => {});
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });
};

const multerMiddleware = multer({ dest: "uploads/" }).single("media");

export { uploadFileToCloudinary, multerMiddleware };
