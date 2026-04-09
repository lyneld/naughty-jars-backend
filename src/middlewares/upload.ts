import multer from "multer";
import { uploadToCloudinary } from "../utils/cloudinary";

// One shared multer instance for the whole app
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Blogs — single image, wide crop
export const processBlogImage = async (req: any, res: any, next: any) => {
  if (!req.file) return next();

  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "blogs",
      width: 1200,
      height: 630,
      crop: "fill",
      quality: "auto",
    });

    req.body.image = result.secure_url;
    next();
  } catch (err: any) {
    res.status(500).json({ error: "Blog image upload failed", message: err.message });
  }
};