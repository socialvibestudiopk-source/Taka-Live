const config = require("./config");
const jwt = require("jsonwebtoken");
const Admin = require("./server/admin/admin.model");
const prisma = require("./prisma");
const mongoose = require("mongoose");

module.exports = () => {
  return async (req, res, next) => {
    const authHeader = req.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), config.JWT_SECRET);

        // --- PRISMA (SUPABASE) CHECK ---
        try {
            const sAdmin = await prisma.admin.findUnique({
                where: { id: decoded._id },
                select: { id: true, role: true, flag: true }
            });
            if (sAdmin && sAdmin.flag !== false) {
                req.admin = { _id: sAdmin.id, role: sAdmin.role, flag: sAdmin.flag };
                return next();
            }
        } catch (e) {}

        // --- MONGO FALLBACK ---
        if (mongoose.connection.readyState === 1) {
            const admin = await Admin.findById(decoded._id).select("_id role flag");
            if (admin && admin.flag !== false) {
                req.admin = admin;
                return next();
            }
        }

        // --- EMERGENCY BYPASS FOR OWNERS ---
        if (decoded.role === "OWNER") {
            req.admin = decoded;
            return next();
        }

      } catch (_) {
        // Fallback to legacy key
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
