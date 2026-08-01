// routes/auth.js handles login, logout, and session checks.

const router = require("express").Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username } = req.body;

  // Reject an empty username.
  if (!username || !username.trim()) {
    return res.status(400).json({
      error: "Username is required",
    });
  }

  // Save the logged-in user in the session.
  req.session.user = {
    username: username.trim(),
  };

  return res.status(200).json({
    message: "Login successful",
    user: req.session.user,
  });
});

// GET /api/auth/session
router.get("/session", (req, res) => {
  res.status(200).json({
    authenticated: Boolean(req.session.user),
    user: req.session.user || null,
  });
});

// POST /api/auth/logout
router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie("connect.sid");

    return res.status(200).json({
      message: "Logout successful",
    });
  });
});

module.exports = router;