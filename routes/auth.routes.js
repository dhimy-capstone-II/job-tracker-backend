/**
 * routes/auth.js — handles signup, login, logout, Auth0 synchronization,
 * and checking the currently authenticated user.
 *
 * app.js mounts this router at /auth:
 *
 *   POST /auth/signup
 *   POST /auth/login
 *   POST /auth/logout
 *   POST /auth/auth0
 *   GET  /auth/me
 *
 * Users can authenticate in two ways:
 *
 *   1. Local account using email/username and password.
 *   2. Social login using an Auth0 access token.
 *
 * Passwords are never stored directly. bcrypt creates a one-way password hash,
 * which is saved in passwordHash.
 */

const express = require("express");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const { rateLimit } = require("express-rate-limit");

const { User } = require("../models");

const {
  jwtCheck,
  requireAuth,
  identityFromToken,
  sendTokenCookie,
  clearTokenCookie,
} = require("../middleware/requireAuth");

const router = express.Router();

// Determines how much work bcrypt performs when hashing passwords.
const SALT_ROUNDS = 12;

// Restrict repeated login and signup attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again later.",
  },
});

// Return clean validation errors instead of a general server error.
function handleDbError(error, res, next) {
  if (
    error.name === "SequelizeValidationError" ||
    error.name === "SequelizeUniqueConstraintError"
  ) {
    return res.status(400).json({
      error: error.errors?.[0]?.message || "Invalid user data",
    });
  }

  return next(error);
}

// Generate an available username for Auth0 users.
async function uniqueUsername(preferred) {
  const cleaned = (preferred || "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 16);

  const base = cleaned.length >= 3 ? cleaned : "user";

  let candidate = base;
  let suffix = 1;

  while (
    await User.findOne({
      where: {
        username: candidate,
      },
    })
  ) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

// -----------------------------------------------------------------------------
// SIGN UP — POST /auth/signup
// -----------------------------------------------------------------------------

router.post("/signup", authLimiter, async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email, and password are all required",
      });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return res.status(400).json({
        error: "Username must be between 3 and 20 characters",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          {
            email: cleanEmail,
          },
          {
            username: cleanUsername,
          },
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error:
          existingUser.email === cleanEmail
            ? "An account with that email already exists"
            : "That username is already taken",
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
    });

    // Signing up also logs the user in.
    sendTokenCookie(res, user);

    return res.status(201).json(user);
  } catch (error) {
    return handleDbError(error, res, next);
  }
});

// -----------------------------------------------------------------------------
// LOG IN — POST /auth/login
// -----------------------------------------------------------------------------

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { identifier, email, username, password } = req.body;

    // Allow the frontend or Postman to send identifier, email, or username.
    const loginValue = identifier || email || username;

    if (!loginValue || !password) {
      return res.status(400).json({
        error: "Email/username and password are required",
      });
    }

    const cleanLogin = loginValue.trim();

    const user = await User.findOne({
      where: {
        [Op.or]: [
          {
            email: cleanLogin.toLowerCase(),
          },
          {
            username: cleanLogin,
          },
        ],
      },
    });

    function invalidCredentials() {
      return res.status(401).json({
        error: "Invalid email/username or password",
      });
    }

    if (!user) {
      return invalidCredentials();
    }

    // Auth0 users do not have a local password.
    if (!user.passwordHash) {
      return res.status(400).json({
        error: "This account uses social login. Sign in with Auth0 instead.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return invalidCredentials();
    }

    sendTokenCookie(res, user);

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
});

// -----------------------------------------------------------------------------
// LOG OUT — POST /auth/logout
// -----------------------------------------------------------------------------

router.post("/logout", (req, res) => {
  clearTokenCookie(res);

  return res.status(200).json({
    message: "Logged out",
  });
});

// -----------------------------------------------------------------------------
// AUTH0 USER SYNC — POST /auth/auth0
// -----------------------------------------------------------------------------

router.post("/auth0", jwtCheck, async (req, res, next) => {
  try {
    const { auth0Id, email, name } = identityFromToken(req);

    const existingUser = await User.findOne({
      where: {
        auth0Id,
      },
    });

    if (existingUser) {
      return res.status(200).json(existingUser);
    }

    const preferredUsername =
      req.body.username ||
      name ||
      email?.split("@")[0];

    const username = await uniqueUsername(preferredUsername);

    const user = await User.create({
      auth0Id,
      username,
      email,
      name,
    });

    return res.status(201).json(user);
  } catch (error) {
    return handleDbError(error, res, next);
  }
});

// -----------------------------------------------------------------------------
// CURRENT USER — GET /auth/me
// -----------------------------------------------------------------------------

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json(req.user);
});

module.exports = router;