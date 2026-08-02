// app.js — the front door of the server.
//
// It creates the Express app, adds middleware, mounts routes,
// connects to PostgreSQL, and starts the server.

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");

const { db } = require("./models");
const {
  applicationsRouter,
  authRouter,
} = require("./routes");

const {
  requireAuth,
} = require("./middleware/requireAuth");

const app = express();

const PORT = process.env.PORT || 3000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

app.set("trust proxy", 1);

// Use a looser rate limit during development because React StrictMode
// may run requests more than once while testing.
const isProd = process.env.NODE_ENV === "production";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 100 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

// ---------- middleware ----------

// Add safer HTTP response headers.
app.use(helmet());

// Read the JWT stored in the httpOnly cookie.
app.use(cookieParser());

// Allow the React frontend to call the backend and include cookies.
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

// Log requests in the terminal.
app.use(morgan("dev"));

// Read JSON request bodies and limit their size.
app.use(express.json({ limit: "10kb" }));

// Apply the general request limit.
app.use(limiter);

// Serve the optional backend information page.
app.use(express.static(path.join(__dirname, "public")));

// ---------- health check ----------

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Health check is valid!",
    uptime: process.uptime(),
  });
});

// ---------- public test route ----------

app.get("/api/public", (req, res) => {
  res.status(200).json({
    message: "The public route is working.",
  });
});

// ---------- protected test route ----------

app.get("/api/protected", requireAuth, (req, res) => {
  res.status(200).json({
    message: "Authentication is valid.",
    userId: req.user.id,
    username: req.user.username,
    via: req.user.auth0Id ? "auth0" : "password",
  });
});

// ---------- authentication routes ----------
//
// These become:
// POST /auth/signup
// POST /auth/login
// POST /auth/logout
// POST /auth/auth0
// GET  /auth/me

app.use("/auth", authRouter);

// ---------- job application routes ----------
//
// Every application route requires authentication.
//
// These become:
// GET    /api/applications
// GET    /api/applications/:id
// POST   /api/applications
// PUT    /api/applications/:id
// PATCH  /api/applications/:id
// DELETE /api/applications/:id

app.use(
  "/api/applications",
  requireAuth,
  applicationsRouter,
);

// ---------- 404 handler ----------

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// ---------- general error handler ----------
//
// Express recognizes this as the error handler because it has
// four parameters.

app.use((error, req, res, next) => {
  console.error("ERROR:", error.message);

  const status =
    error.status ||
    error.statusCode ||
    500;

  const message =
    status === 401
      ? "Invalid or missing token"
      : "Something went wrong on the server";

  res.status(status).json({
    error: message,
  });
});

// ---------- start the server ----------

async function startApp() {
  try {
    // Check that PostgreSQL is reachable.
    await db.authenticate();
    console.log("🐘 Database connection established.");

    // Create missing tables without deleting existing data.
    await db.sync();
    console.log("🧩 Models synced.");

    const server = app.listen(PORT, () => {
      console.log(
        `🚀 Server is running on http://localhost:${PORT}`,
      );
    });

    // Close Express and PostgreSQL safely when the process stops.
    function shutdown() {
      console.log("\n👋 Shutting down...");

      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    }

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error(
      "❌ Unable to start server:",
      error.message,
    );

    process.exit(1);
  }
}

startApp();