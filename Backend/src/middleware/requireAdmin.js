const { HttpError } = require("../utils/HttpError");

// Gatekeeper for all /api/admin routes: requires req.user to be present and have role === 'ADMIN'.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    throw new HttpError(403, "FORBIDDEN", "Admin access required. Please sign in with an authorized admin account.");
  }
  next();
}

module.exports = { requireAdmin };

