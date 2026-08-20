import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import multer from "multer";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes";
import blogRoutes from "./routes/blogRoutes";
import crewRoutes from "./routes/crewRoutes";
import likeRoutes from "./routes/likeRoutes";
import productRoutes from "./routes/productRoutes";
import testimonialRoutes from "./routes/testimonialRoutes";

export interface AppOptions {
  nodeEnv?: string;
  frontendUrl?: string;
  disableRateLimits?: boolean;
}

export const createApp = (options: AppOptions = {}) => {
  const app = express();
  const nodeEnv = options.nodeEnv || process.env.NODE_ENV || "development";

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  if (nodeEnv !== "production") {
    app.use(cors({
      origin: options.frontendUrl || process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }));
  }

  app.get("/api/health/live", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/health/ready", (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not-ready" });
  });

  if (!options.disableRateLimits) {
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }));

    app.use(["/api/auth/login", "/api/auth/register"], rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }));
  }

  app.use("/api/products", productRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/crew", crewRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/testimonials", testimonialRoutes);
  app.use("/api/blog", blogRoutes);
  app.use("/api/likes", likeRoutes);

  app.get("/", (_req, res) => {
    res.send("API is running...");
  });

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError || error.message === "Only image files are allowed") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Unhandled request error:", error);
    return res.status(500).json({ message: "Internal server error" });
  });

  return app;
};
