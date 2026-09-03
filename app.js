// app.js — builds the Express application.
//
// This file only ASSEMBLES the app: middleware, routes, and error handling.
// It does not open a port and does not connect to the database. server.js does
// that. Keeping the two separate means the tests can import this app and make
// real HTTP requests against it without starting a long-running server or
// fighting over port 3000.

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");

const {
  applicationsRouter,
  authRouter,
  analyticsRouter,
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
  limit: isProd ? 200 : 1000,
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

// Log requests in the terminal. Tests make hundreds of requests, so the log is
// switched off there to keep the test output readable.
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

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

// ---------- analytics routes ----------
//
// Read-only statistics for the logged-in user's own applications.
//
// These become:
// GET /api/analytics/summary

app.use(
  "/api/analytics",
  requireAuth,
  analyticsRouter,
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

// Export the assembled app. server.js starts it; the tests import it directly.
module.exports = app;
