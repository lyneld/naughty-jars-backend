// crewRoutes.ts
import express from "express";
import {
  createCrew,
  getAllCrew,
  getPublicCrew,
  getCrewById,
  updateCrew,
  deleteCrew,
  updateCrewStatus
} from "../controllers/crew";
import { authenticateJWT } from "../middlewares/auth";
import { requireAdmin } from "../middlewares/adminAuth";
import { upload } from "../middlewares/upload";

const router = express.Router();

// Public route returns active team members only.
router.get("/", getPublicCrew);

// Admin reads must be declared before parameterised routes.
router.get("/admin", authenticateJWT, requireAdmin, getAllCrew);
router.get("/admin/:id", authenticateJWT, requireAdmin, getCrewById);
router.put("/status/bulk", authenticateJWT, requireAdmin, updateCrewStatus);

// Protected routes (require authentication)
router.post("/", 
  authenticateJWT, // Add authentication
  requireAdmin, // Add admin check
  upload.single("image"),
  createCrew
);

router.put("/:id", 
  authenticateJWT, // Add authentication
  requireAdmin, // Add admin check
  upload.single("image"),
  updateCrew
);

router.delete("/:id", 
  authenticateJWT, // Already has this
  requireAdmin, // Already has this
  deleteCrew
);



export default router;
