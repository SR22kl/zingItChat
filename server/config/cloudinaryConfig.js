import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import fs from "fs";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFileToCloudinary = async (file) => {
  let resourceType = "image";
  if (file.mimetype && file.mimetype.startsWith("video"))
    resourceType = "video";
  else if (
    file.mimetype &&
    (file.mimetype.includes("pdf") ||
      file.mimetype.includes("msword") ||
      file.mimetype.includes("officedocument") ||
      file.mimetype.includes("text"))
  )
    resourceType = "raw";

  const options = { resource_type: resourceType };

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    if (file.buffer) {
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    } else if (file.path) {
      const rs = fs.createReadStream(file.path);
      rs.pipe(uploadStream);
    } else {
      reject(new Error("No file buffer or path to upload"));
    }
  });
};

// Use memoryStorage to avoid creating local upload dirs on read-only filesystems
const multerMiddleware = multer({ storage: multer.memoryStorage() }).single(
  "media"
);

export { multerMiddleware, uploadFileToCloudinary };
