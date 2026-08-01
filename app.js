// app.js starts Express and connects to PostgreSQL.

// Load environment variables from .env.
require("dotenv").config();

// Import external packages.
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const session = require("express-session");
const { rateLimit } = require("express-rate-limit");
// Import the database and application routes.
const { db } = require("./models");
// Import all routers from routes/index.js.
const { applicationsRouter, authRouter } = require("./routes");
const requireAuth = require("./middleware/requireAuth");
// Create the Express application.
const app = express();

// Use Render's port when deployed, or port 3000 locally.
const PORT = process.env.PORT || 3000;

// app.js is the front door of the server.
// It creates the app, adds middleware, mounts routes,
// connects to the database, and starts the server.

// Trust the deployment proxy so Express can detect the real visitor IP.
app.set("trust proxy", 1);

// Limit how many requests one IP can make.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum requests per IP during that time
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

// ---------- middleware ----------
// Middleware runs in order on every request before it reaches the routes.

// Add safer HTTP response headers.
app.use(helmet());

// Allow the React frontend to call the backend and send cookies.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
// Create and manage a session for each logged-in user.
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Protects the session cookie.

    resave: false, // Do not save the session again when nothing changed.

    saveUninitialized: false, // Do not create an empty session for every visitor.

    cookie: {
      httpOnly: true, // Prevent frontend JavaScript from reading the cookie.

      secure: process.env.NODE_ENV === "production", // Require HTTPS cookies when deployed.

      // Allow the deployed frontend and backend to share the cookie.
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);
app.use(morgan("dev")); // Log requests in the terminal.
app.use(express.json({ limit: "10kb" })); // Read JSON request bodies and limit their size.
app.use(limiter); // Limit repeated requests from the same IP.
app.use(express.static(path.join(__dirname, "public"))); // Serve files stored in the public folder.

// ---------- health check ----------
// Confirm that the backend server is running.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Health check is valid!",
  });
});

// ---------- API routes ----------
// Authentication routes handle login, logout, and session checks.
app.use("/api/auth", authRouter);

// Application routes require the user to be logged in.
app.use("/api/applications", requireAuth, applicationsRouter);

// ---------- 404 ----------
// This runs only when no route above matched the request.
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// ---------- general error handler ----------
// Express recognizes this as an error handler because it has four parameters.
app.use((err, req, res, next) => {
  console.error("ERROR:", err.message);

  res.status(500).json({
    error: "Something went wrong on the server",
  });
});

// ---------- start the server ----------
// Do not start listening until the database connection is ready.
// authenticate() checks the connection.
// sync() creates missing tables from the Sequelize models.
// Never use sync({ force: true }) here because it deletes existing tables.

// Connect to PostgreSQL and start Express.
async function startApp() {
  try {
    // Check that the database connection works.
    await db.authenticate();
    console.log("Database connected successfully.");

    // Create any missing tables from the Sequelize models.
    await db.sync();
    console.log("Database synced successfully.");

    // Start the Express server after the database is ready.
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // Close the server and database safely when the app stops.
    async function shutdown() {
      console.log("Shutting down server...");

      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    }

    // Listen for shutdown signals.
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startApp();
