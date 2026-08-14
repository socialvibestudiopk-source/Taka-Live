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

        // 1. Master Owner Bypass (Hardcoded Role or Specific Root ID)
        if (decoded.role === "OWNER" || decoded._id === "OWNER_ROOT_587385") {
            req.admin = {
                _id: decoded._id,
                role: "OWNER",
                email: decoded.email,
                flag: true
            };
            return next();
        }

        // 2. Prisma (Supabase) Database Check for Managers/Staff
        try {
            // Only search if the ID looks like a UUID
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
        } catch (e) {
            console.error("Prisma Access Error:", e.message);
        }

        // 3. Mongo Fallback for Managers/Staff
        if (mongoose.connection.readyState === 1) {
            try {
                // Only search if it's a valid Mongo ObjectId
                if (mongoose.Types.ObjectId.isValid(decoded._id)) {
                    const admin = await Admin.findById(decoded._id).select("_id role flag");
                    if (admin && admin.flag !== false) {
                        req.admin = admin;
                        return next();
                    }
                }
            } catch (e) {}
        }

      } catch (err) {
        console.warn("JWT Verification Failed:", err.message);
      }
    }

    // 4. Legacy Header Key Check (for Mobile/Old integrations)
    const token = req.headers.key || req.body.key || req.query.key;
    if (token && token === config.SECRET_KEY) {
        return next();
    }

    return res.status(401).json({ status: false, error: "Unauthorized Access" });
  };
};
