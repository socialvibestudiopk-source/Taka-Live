const Admin = require("../admin/admin.model");
const prisma = require("../../prisma");
const jwt = require("jsonwebtoken");
const config = require("../../config");
const mongoose = require("mongoose");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader)
      return res.status(403).json({ status: false, message: "You are not Authorized" });

    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);

        // 1. Root Owner Bypass
        if (decoded.role === "OWNER" || decoded._id === "OWNER_ROOT_587385") {
            req.admin = { _id: decoded._id, role: "OWNER", email: decoded.email, flag: true };
            return next();
        }

        // 2. Prisma (Supabase) Database Check
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded._id);
        if (isUUID) {
            const sAdmin = await prisma.admin.findUnique({
                where: { id: decoded._id },
                select: { id: true, role: true, flag: true }
            });
            if (sAdmin && sAdmin.flag !== false) {
                req.admin = { _id: sAdmin.id, role: sAdmin.role, flag: sAdmin.flag };
                return next();
            }
        }

        // 3. Mongo Fallback
        if (mongoose.connection.readyState === 1) {
            if (mongoose.Types.ObjectId.isValid(decoded._id)) {
                const admin = await Admin.findById(decoded._id).select("_id role flag");
                if (admin && admin.flag !== false) {
                    req.admin = admin;
                    return next();
                }
            }
        }

    } catch (jwtErr) {
        console.warn("Middleware JWT Error:", jwtErr.message);
    }

    return res.status(401).json({ status: false, message: "Invalid or Expired Session" });
  } catch (error) {
    console.error("Middleware Global Error:", error.message);
    return res.status(401).json({ status: false, message: "Authentication Failed" });
  }
};
