import dotenv from "dotenv";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

export interface RuntimeConfig {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  mongoUri: string;
  jwtSecret: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  frontendUrl: string;
}

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const getRuntimeConfig = (): RuntimeConfig => {
  const rawPort = process.env.PORT || "5000";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${rawPort}`);
  }

  const rawNodeEnv = process.env.NODE_ENV || "development";
  if (!["development", "test", "production"].includes(rawNodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${rawNodeEnv}`);
  }

  const jwtSecret = required("JWT_SECRET");
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  return {
    nodeEnv: rawNodeEnv as RuntimeConfig["nodeEnv"],
    host: process.env.HOST?.trim() || "127.0.0.1",
    port,
    mongoUri: required("MONGO_URI"),
    jwtSecret,
    cloudinaryCloudName: required("CLOUDINARY_CLOUD_NAME"),
    cloudinaryApiKey: required("CLOUDINARY_API_KEY"),
    cloudinaryApiSecret: required("CLOUDINARY_API_SECRET"),
    frontendUrl: process.env.FRONTEND_URL?.trim() || "http://localhost:5173",
  };
};
