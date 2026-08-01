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


