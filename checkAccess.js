const jwt = require("jsonwebtoken");
const config = require("./config");
const prisma = require("./prisma");

module.exports = () => {
  return async (req, res, next) => {
    const authHeader = req.get("Authorization");

    // 1. Bearer Token Authentication
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const secret = process.env.JWT_SECRET || "TAKAlive_JWT_Secret_Key_587385";
        const decoded = jwt.verify(token, secret);

        // 🛡️ MASTER BYPASS: Identify Hardcoded Root Owner
        if (decoded.role === "OWNER" || decoded._id === "OWNER_ROOT_587385") {
            req.admin = {
                _id: "OWNER_ROOT_587385",
                role: "OWNER",
                email: "socialvibestudiopk@gmail.com",
                flag: true
            };
            return next();
        }

        // 2. PRISMA DATABASE CHECK (For Managers/Staff)
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
        console.warn("Auth Token Validation Failed:", err.message);
      }
    }

    // 3. LEGACY MASTER KEY CHECK (For Mobile App or Emergency)
    const masterKey = req.headers.key || req.body.key || req.query.key;
    if (masterKey && masterKey === (process.env.SECRET_KEY || "BS67Rfb0Tf")) {
        return next();
    }

    return res.status(401).json({ status: false, error: "Unauthorized: Please login again" });
  };
};
