const config = require("./config");
const jwt = require("jsonwebtoken");
const Admin = require("./server/admin/admin.model");

module.exports = () => {
  return async (req, res, next) => {
    const authHeader = req.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), config.JWT_SECRET);
        const admin = await Admin.findById(decoded._id).select("_id role flag");
        if (admin && admin.flag !== false) {
          req.admin = admin;
          return next();
        }
      } catch (_) {
        // Keep the legacy key fallback below for the mobile app during migration.
      }
    }

    const token = req.headers.key || req.body.key || req.query.key;
    if (token) {
      if (token == config.SECRET_KEY) {
        next();
      } else {
        return res
          .status(401)
          .json({ status: false, error: "Unauthorized Access" });
      }
    } else {
      return res
        .status(401)
        .json({ status: false, error: "Unauthorized Access" });
    }
  };
};
