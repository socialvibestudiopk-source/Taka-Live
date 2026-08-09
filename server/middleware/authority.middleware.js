const jwt = require("jsonwebtoken");
const config = require("../../config");
const Admin = require("../admin/admin.model");

// Check if the requester has Official Owner authority
exports.isOwner = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ status: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (decoded.email === "socialvibestudiopk@gmail.com" || decoded.role === "OWNER" || decoded.role === "OFFICIAL_OWNER") {
      req.admin = decoded;
      return next();
    }

    return res.status(403).json({ status: false, message: "Only Official Owner can perform this action" });
  } catch (error) {
    return res.status(401).json({ status: false, message: "Invalid Token" });
  }
};

// High level staff (Owner, Super Admin, Manager)
exports.isHighStaff = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      const decoded = jwt.verify(token, config.JWT_SECRET);

      const allowedRoles = ["OWNER", "OFFICIAL_OWNER", "super_admin", "manager"];
      if (allowedRoles.includes(decoded.role) || decoded.email === "socialvibestudiopk@gmail.com") {
        req.admin = decoded;
        return next();
      }
      return res.status(403).json({ status: false, message: "Insufficient permissions" });
    } catch (error) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }
};

exports.isSuperAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ status: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (decoded.role === "super_admin" || decoded.role === "OWNER" || decoded.role === "OFFICIAL_OWNER") {
      req.admin = decoded;
      return next();
    }
    return res.status(403).json({ status: false, message: "Access denied. Super Admin role required." });
  } catch (error) {
    return res.status(401).json({ status: false, message: "Invalid Token" });
  }
};
