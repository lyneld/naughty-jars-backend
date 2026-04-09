// src/adminSeeder.ts
import mongoose from "mongoose";
import "dotenv/config";
import User from "./models/user";

const MONGO_URI = process.env.MONGO_URI!;

const seedAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected for seeding...");

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists. Exiting...");
      process.exit(0);
    }

    // ✅ PLAIN password — model will hash it
    await User.create({
      username: "admin",
      email: "admin@naughtyjars.com",
      password: "NJars@123#",
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
