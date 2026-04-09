import { Router } from "express";
import {
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductDetails,
  getFeaturedProducts,
  getPublishedProducts
} from "../controllers/product";
import { authenticateJWT } from "../middlewares/auth";
import { requireAdmin } from "../middlewares/adminAuth";
import { upload } from "../middlewares/upload";

const router = Router();

// Public routes
router.get("/published", getPublishedProducts);
router.get("/featured", getFeaturedProducts);
router.get("/:id", getProductDetails);

// Admin routes with image upload support
// Use array() instead of fields() for multiple images with same field name
router.post("/", 
  authenticateJWT, 
  requireAdmin, 
  upload.array('images', 10), // Changed from fields() to array()
  addProduct
);

router.put("/:id", 
  authenticateJWT, 
  requireAdmin, 
  upload.array('images', 10), // Changed from fields() to array()
  updateProduct
);

router.delete("/:id", authenticateJWT, requireAdmin, deleteProduct);
router.get("/", authenticateJWT, requireAdmin, getAllProducts);

export default router;