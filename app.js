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
