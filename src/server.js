import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startNotificationScheduler } from "./services/notification.scheduler.js";

/** Render / Railway inject PORT — do not hardcode. Bind 0.0.0.0 in cloud (not a LAN IP). */
const isCloud = Boolean(
  process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production"
);
const BASE_PORT = Number(process.env.PORT) || env.PORT || 5000;
const HOST = isCloud ? "0.0.0.0" : env.HOST || "0.0.0.0";
const PORT_FALLBACK_ATTEMPTS = isCloud ? 0 : 10;

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
// lala
// lalala
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

    server = await listenWithFallback(BASE_PORT, PORT_FALLBACK_ATTEMPTS);
  } catch (err) {
    shutdown(err, "startupError");
  }
};

start();
