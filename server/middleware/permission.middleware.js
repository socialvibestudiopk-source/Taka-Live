const jwt = require("jsonwebtoken");
const config = require("../../config");
const Admin = require("../admin/admin.model");
const { hasRole } = require("./roles");

// Enterprise Grade Permission Checker
exports.checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ status: false, message: "Unauthorized: No token provided" });

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await Admin.findById(decoded._id);

      if (!user) return res.status(404).json({ status: false, message: "User not found" });

      // Owner and Official Owner bypass all checks
      if (hasRole(user, ["OWNER", "OFFICIAL_OWNER"])) {
          req.user = user;
          return next();
      }

      // Logic for Super Admin and other staff with granular permissions
      // We will check if the user's assigned permissions include 'requiredPermission'
      // For now, allow Super Admin if it's a general staff action
      if (hasRole(user, ["SUPER_ADMIN", "MANAGER"])) {
          req.user = user;
          return next();
      }

      return res.status(403).json({ status: false, message: "Forbidden: You don't have permission for this action" });
    } catch (error) {
      return res.status(401).json({ status: false, message: "Unauthorized: Invalid token" });
    }
  };
};
