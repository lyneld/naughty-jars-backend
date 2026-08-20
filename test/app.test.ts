import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const app = createApp({ nodeEnv: "production", disableRateLimits: true });

describe("application security and health routes", () => {
  it("reports process liveness", async () => {
    const response = await request(app).get("/api/health/live");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("reports not-ready without a MongoDB connection", async () => {
    const response = await request(app).get("/api/health/ready");
    expect(response.status).toBe(503);
    expect(response.body.status).toBe("not-ready");
  });

  it("does not expose the former public user administration routes", async () => {
    expect((await request(app).get("/api/auth/")).status).toBe(404);
    expect((await request(app).get("/api/auth/507f1f77bcf86cd799439011")).status).toBe(404);
    expect((await request(app).put("/api/auth/507f1f77bcf86cd799439011").send({ role: "admin" })).status).toBe(404);
    expect((await request(app).delete("/api/auth/507f1f77bcf86cd799439011")).status).toBe(404);
  });

  it("protects admin user listing", async () => {
    const response = await request(app).get("/api/admin/users");
    expect(response.status).toBe(401);
  });

  it("protects full crew records and removes public crew detail access", async () => {
    expect((await request(app).get("/api/crew/admin")).status).toBe(401);
    expect((await request(app).get("/api/crew/507f1f77bcf86cd799439011")).status).toBe(404);
  });

  it("does not emit cross-origin headers in production", async () => {
    const response = await request(app).get("/api/health/live").set("Origin", "https://attacker.example");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rate limits repeated authentication attempts", async () => {
    const limitedApp = createApp({ nodeEnv: "production" });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await request(limitedApp).post("/api/auth/login").send({})).status).toBe(400);
    }
    expect((await request(limitedApp).post("/api/auth/login").send({})).status).toBe(429);
  });
});
