import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

const PORT = env.PORT || 5000;

let server;
let isShuttingDown = false;

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

const start = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`server is running on port ${PORT}`);
    });
  } catch (err) {
    shutdown(err, "startupError");
  }
};

start();
