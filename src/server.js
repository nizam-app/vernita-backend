import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startNotificationScheduler } from "./services/notification.scheduler.js";

/** Railway injects PORT; do not hardcode. Use 0.0.0.0 in cloud (not a LAN IP). */
const BASE_PORT = Number(process.env.PORT) || env.PORT || 5000;
const HOST = process.env.RAILWAY_ENVIRONMENT ? "0.0.0.0" : env.HOST || "0.0.0.0";

let server;
let isShuttingDown = false;
let stopScheduler = null;

const shutdown = (err, label) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.error(label, err);

  if (server) {
    return server.close(() => process.exit(1));
  }
  process.exit(1);
};

process.once("unhandledRejection", (err) => shutdown(err, "unhandledRejection"));
process.once("uncaughtException", (err) => shutdown(err, "uncaughtException"));

const listenWithFallback = (port, remainingAttempts) =>
  new Promise((resolve, reject) => {
    const s = app.listen(port, HOST, () => {
      console.log(`server is running at http://${HOST}:${port}`);
      resolve(s);
    });

    s.once("error", (err) => {
      if (err?.code === "EADDRINUSE" && remainingAttempts > 0) {
        console.warn(
          `Port ${port} is already in use on ${HOST}. Trying ${port + 1}...`
        );
        return resolve(listenWithFallback(port + 1, remainingAttempts - 1));
      }
      reject(err);
    });
  });

const start = async () => {
  try {
    await connectDB();
    stopScheduler = startNotificationScheduler();

    // Try a few consecutive ports to avoid crashing during local dev
    server = await listenWithFallback(BASE_PORT, 10);
  } catch (err) {
    shutdown(err, "startupError");
  }
};

start();
