const Admin = require("../admin/admin.model");
const jwt = require("jsonwebtoken");
const config = require("../../config");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader)
      return res
        .status(403)
        .json({ status: false, message: "You are not Authorized" });

    // Handle "Bearer <token>" format
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

    const decodeToken = await jwt.verify(token, config.JWT_SECRET);

    const admin = await Admin.findById(decodeToken._id);
    if (!admin) {
        return res.status(403).json({ status: false, message: "Admin not found" });
    }
    req.admin = admin;
    next();
  } catch (error) {
    console.log("AUTH ERROR:", error.message);
    return res.status(401).json({ status: false, message: "Invalid or Expired Token" });
  }
};
