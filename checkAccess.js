const jwt = require("jsonwebtoken");
const config = require("./config");
const prisma = require("./prisma");

module.exports = () => {
  return async (req, res, next) => {
    // 1. LEGACY MASTER KEY CHECK (Priority for Mobile App)
    const masterKey = req.get("key") || req.headers.key || req.body.key || req.query.key;
    if (masterKey && (masterKey === "BS67Rfb0Tf" || masterKey === config.SECRET_KEY)) {
        return next();
    }

    const authHeader = req.get("Authorization");

    // 2. Bearer Token Authentication (For Panel/Web)
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        // Special Bypass for Owner Private Panel
        if (token === "OWNER_MASTER_BYPASS_587385") {
            req.admin = { _id: "OWNER_ROOT_587385", role: "OWNER", flag: true };
            return next();
        }

        const decoded = jwt.verify(token, config.JWT_SECRET || "TAKAlive_JWT_Secret_Key_587385");

        if (decoded.role === "OWNER" || decoded._id === "OWNER_ROOT_587385") {
            req.admin = { _id: "OWNER_ROOT_587385", role: "OWNER", flag: true };
            return next();
        }

        // Prisma Check for Staff
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
      } catch (err) {
        // Fall through to 401
      }
    }

    return res.status(401).json({ status: false, error: "Unauthorized Access" });
  };
};
