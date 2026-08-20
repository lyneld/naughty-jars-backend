import { createApp } from "./app";
import { connectDB } from "./config/mongodb";
import { getRuntimeConfig } from "./config/env";
import mongoose from "mongoose";

const startServer = async () => {
  try {
    const config = getRuntimeConfig();
    await connectDB(config.mongoUri);
    const app = createApp({ nodeEnv: config.nodeEnv, frontendUrl: config.frontendUrl });
    const server = app.listen(config.port, config.host, () => {
      console.log(`Server listening at http://${config.host}:${config.port}`);
      process.send?.("ready");
    });

    let shuttingDown = false;
    const shutdown = (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`Received ${signal}; shutting down gracefully`);
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
