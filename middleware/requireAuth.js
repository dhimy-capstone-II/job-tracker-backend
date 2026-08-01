// requireAuth.js protects routes that require a logged-in user.

function requireAuth(req, res, next) {
  // Check whether the session contains a logged-in user.
  if (req.session.user) {
    // Continue to the next middleware or route.
    return next();
  }

  // Stop the request when the user is not logged in.
  return res.status(401).json({
    error: "You must log in to access this resource",
  });
}

// Export the middleware so app.js can use it.
module.exports = requireAuth;