const jwt = require("jsonwebtoken");
const config = require("../config");
const Admin = require("../server/admin/admin.model");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ status: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);

    const admin = await Admin.findById(decoded._id);

    if (!admin) {
      return res.status(401).json({ status: false, message: "User not found" });
    }

    // Strict check for Owner email or a specific OWNER role
    if (admin.email !== process.env.OWNER_EMAIL && admin.role !== "OWNER") {
      return res.status(403).json({ status: false, message: "Access Denied: Only the Official Owner can access this panel." });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ status: false, message: "Invalid or expired token" });
  }
};
