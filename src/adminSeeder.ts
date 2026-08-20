// src/adminSeeder.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

const MONGO_URI = process.env.MONGO_URI!;

const seedAdmin = async () => {
  try {
    const username = process.env.ADMIN_USERNAME?.trim();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!MONGO_URI || !username || !email || !password || password.length < 12) {
      throw new Error("MONGO_URI, ADMIN_USERNAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters are required");
    }

    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected for seeding...");

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists. Exiting...");
      process.exit(0);
    }

    // ✅ PLAIN password — model will hash it
    await User.create({
      username,
      email,
      password,
      role: "admin",
    });

    console.log("✅ Admin user created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedAdmin();
