const Admin = require("../admin/admin.model");
const supabase = require("../../supabase");
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

    // Verify with Supabase first
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
        // Find corresponding admin by email or supabase id
        let admin = await Admin.findOne({ $or: [{ email: user.email }, { supabaseId: user.id }] });

        if (admin) {
            req.admin = admin;
            return next();
        }
    }

    // Legacy JWT Fallback
    try {
        const decodeToken = await jwt.verify(token, config.JWT_SECRET);
        const admin = await Admin.findById(decodeToken._id);
        if (admin) {
            req.admin = admin;
            return next();
        }
    } catch (e) {
        // Fallback failed
    }

    return res.status(401).json({ status: false, message: "Invalid or Expired Token" });
  } catch (error) {
    console.log("AUTH ERROR:", error.message);
    return res.status(401).json({ status: false, message: "Invalid or Expired Token" });
  }
};
