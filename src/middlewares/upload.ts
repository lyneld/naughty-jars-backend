import multer from "multer";
import { uploadToCloudinary } from "../utils/cloudinary";

// One shared multer instance for the whole app
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
    fields: 30,
  },
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
    console.error("Blog image upload failed:", err);
    res.status(502).json({ message: "Blog image upload failed" });
  }
};
