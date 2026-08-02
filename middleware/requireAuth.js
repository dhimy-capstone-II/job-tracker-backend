// middleware/requireAuth.js — who is making this request?
//
// Our app accepts TWO kinds of proof of identity:
//
//   1. OUR OWN JWT, stored in an httpOnly cookie.
//      It is issued by /auth/signup and /auth/login after the password
//      is checked with bcrypt.
//
//   2. AN AUTH0 ACCESS TOKEN, sent in the Authorization header.
//      Auth0 signs it with RS256, and express-oauth2-jwt-bearer
//      verifies it using Auth0's public key.
//
// requireAuth accepts either one and resolves both to req.user,
// a row from our own users table.

const jwt = require("jsonwebtoken");
const { auth } = require("express-oauth2-jwt-bearer");

const { User } = require("../models");

// Custom Auth0 claims namespace.
// This must match the namespace used in the Auth0 Post-Login Action.
const CLAIMS_NAMESPACE =
  process.env.AUTH0_CLAIMS_NAMESPACE || "https://myapp.example.com";

// ---------- our JWT settings ----------

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error(
    "Missing JWT_SECRET — set it in .env and .env.example.",
  );
}

if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
  throw new Error(
    "Missing Auth0 environment variables — set AUTH0_DOMAIN and AUTH0_AUDIENCE.",
  );
}

// Accept either a bare Auth0 domain or one copied with https://.
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

// ---------- token helpers ----------

// Create a signed JWT for a local user.
const signToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      username: user.username,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );

const isProd = process.env.NODE_ENV === "production";
const COOKIE_NAME = "token";

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Put the signed JWT in an httpOnly cookie.
const sendTokenCookie = (res, user) =>
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions);

// Remove the authentication cookie.
const clearTokenCookie = (res) =>
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });

// ---------- Auth0 verification ----------

const jwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  tokenSigningAlg: "RS256",
});

// ---------- unified authentication guard ----------

const requireAuth = async (req, res, next) => {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  const bearer = req.headers.authorization?.startsWith("Bearer ");

  // Door 1: local JWT stored in a cookie.
  if (cookieToken) {
    try {
      const payload = jwt.verify(cookieToken, JWT_SECRET);
      const user = await User.findByPk(payload.sub);

      if (!user) {
        clearTokenCookie(res);

        return res.status(401).json({
          error: "Session no longer valid",
        });
      }

      req.user = user;
      return next();
    } catch {
      clearTokenCookie(res);

      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }
  }

  // Door 2: Auth0 access token.
  if (bearer) {
    return jwtCheck(req, res, async (error) => {
      if (error) {
        return next(error);
      }

      try {
        const user = await User.findOne({
          where: {
            auth0Id: req.auth.payload.sub,
          },
        });

        if (!user) {
          return res.status(404).json({
            error: "User not found. Sync first with POST /auth/auth0.",
          });
        }

        req.user = user;
        return next();
      } catch (databaseError) {
        return next(databaseError);
      }
    });
  }

  // No valid authentication was provided.
  return res.status(401).json({
    error: "Authentication required",
  });
};

// Read trusted identity fields from a verified Auth0 token.
const identityFromToken = (req) => {
  const claims = req.auth.payload;

  return {
    auth0Id: claims.sub,
    email: claims[`${CLAIMS_NAMESPACE}/email`] || null,
    name: claims[`${CLAIMS_NAMESPACE}/name`] || null,
  };
};

module.exports = {
  jwtCheck,
  requireAuth,
  identityFromToken,
  signToken,
  sendTokenCookie,
  clearTokenCookie,
  CLAIMS_NAMESPACE,
};