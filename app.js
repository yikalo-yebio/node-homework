const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimiter = require("express-rate-limit");

const timeRouter = require("./routes/timeRoutes");
const userRouter = require("./routes/userRoutes");
const taskRouter = require("./routes/taskRoutes");
const analyticsRouter = require("./routes/analyticsRoutes");

const jwtMiddleware = require("./middleware/jwtMiddleware");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

const prisma = require("./db/prisma");

const app = express();

app.set("trust proxy", 1);

global.users = [];
global.tasks = [];

// Rate limiting should come before other app.use() middleware
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// Body and cookie parsers
app.use(express.json());
app.use(cookieParser());

// XSS protection must come after the parsers
app.use(xss());

// Security-related HTTP headers
app.use(helmet());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.post("/testpost", (req, res) => {
  res.status(200).json({
    message: "POST route works",
  });
});

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
      db: "connected",
    });
  } catch (err) {
    if (err.name === "PrismaClientInitializationError") {
      console.error(
        "Couldn't connect to the database. Is it running?"
      );
    }

    res.status(500).json({
      status: "error",
      db: "not connected",
      error: err.message,
    });
  }
});

app.use("/api", timeRouter);
app.use("/api/users", userRouter);

// taskRoutes.js already uses router.use(jwtMiddleware)
app.use("/api/tasks", taskRouter);

// Keep analytics routes protected
app.use("/api/analytics", jwtMiddleware, analyticsRouter);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}...`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error("Server error:", err);
  }

  process.exit(1);
});

let isShuttingDown = false;

async function shutdown(code = 0) {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log("Shutting down gracefully...");

  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log("HTTP server closed.");

    await prisma.$disconnect();
    console.log("Prisma disconnected");
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

module.exports = { app, server };
