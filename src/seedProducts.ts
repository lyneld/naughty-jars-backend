import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/product";
import { data } from "./data/data"; 

dotenv.config({ path: process.env.ENV_FILE || ".env" });

const MONGO_URI = process.env.MONGO_URI; 

const seedProducts = async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in .env");
    if (process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
      throw new Error("Set ALLOW_DESTRUCTIVE_SEED=true to replace all products");
    }

    await mongoose.connect(MONGO_URI);
    console.log(" MongoDB connected");

    await Product.deleteMany({});
    console.log(" Old products deleted");

    await Product.insertMany(data);
    console.log(" Products inserted successfully");

    await mongoose.disconnect();
    console.log(" MongoDB disconnected");
  } catch (error) {
    console.error(" Error seeding products:", error);
    mongoose.disconnect();
  }
};

seedProducts();
