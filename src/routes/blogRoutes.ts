import { Router } from "express";
import { 
  createBlog, 
  updateBlog, 
  getBlog, 
  getAllBlogs, 
  getPublishedBlogs, 
  deleteBlog 
} from "../controllers/blog";
import { authenticateJWT } from "../middlewares/auth";
import { requireAdmin } from "../middlewares/adminAuth";
import { processBlogImage, upload } from "../middlewares/upload";


const router = Router();

// Public routes
router.get("/published", getPublishedBlogs);
router.get("/:id", getBlog);

// Admin routes with image upload support
router.post("/", authenticateJWT, requireAdmin, upload.single("image"), processBlogImage, createBlog);

router.put("/:id", authenticateJWT, requireAdmin, upload.single("image"), processBlogImage, updateBlog);

router.delete("/:id", authenticateJWT, requireAdmin, deleteBlog);
router.get("/", authenticateJWT, requireAdmin, getAllBlogs);

export default router;
