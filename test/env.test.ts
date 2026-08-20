import { afterEach, describe, expect, it } from "vitest";
import { getRuntimeConfig } from "../src/config/env";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

const validEnvironment = () => {
  process.env.NODE_ENV = "production";
  process.env.PORT = "5000";
  process.env.MONGO_URI = "mongodb://example.invalid/database";
  process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters";
  process.env.CLOUDINARY_CLOUD_NAME = "cloud";
  process.env.CLOUDINARY_API_KEY = "key";
  process.env.CLOUDINARY_API_SECRET = "secret";
};

describe("runtime configuration", () => {
  it("binds to loopback by default", () => {
    validEnvironment();
    delete process.env.HOST;
    expect(getRuntimeConfig().host).toBe("127.0.0.1");
  });

  it("rejects missing secrets", () => {
    validEnvironment();
    delete process.env.JWT_SECRET;
    expect(() => getRuntimeConfig()).toThrow("JWT_SECRET");
  });

  it("rejects weak JWT secrets", () => {
    validEnvironment();
    process.env.JWT_SECRET = "too-short";
    expect(() => getRuntimeConfig()).toThrow("at least 32 characters");
  });

  it("rejects invalid ports", () => {
    validEnvironment();
    process.env.PORT = "70000";
    expect(() => getRuntimeConfig()).toThrow("Invalid PORT");
  });
});
