// server.ts
import { connectDB } from "./config/mongodb";
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path"; 
import productRoutes from "./routes/productRoutes";
import authRoutes from "./routes/authRoutes";
import crewRoutes from "./routes/crewRoutes";
import adminRoutes from "./routes/adminRoutes";
import testimonialRoutes from "./routes/testimonialRoutes"
import blogRoutes from "./routes/blogRoutes"
import likeRoutes from "./routes/likeRoutes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this for form data

// Serve static files from multiple directories
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public'))); 

app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? process.env.FRONTEND_URL || true
    : "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/crew", crewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/likes", likeRoutes)

app.get("/", (req, res) => {
  res.send("API is running...");
});

const startServer = async () => {
  try {
    await connectDB();
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server Listening @ ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();