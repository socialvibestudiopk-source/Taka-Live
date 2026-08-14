const jwt = require("jsonwebtoken");
const prisma = require("../../prisma");
const config = require("../../config");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader) return res.status(403).json({ status: false, message: "No Authorization Header" });

    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);

        // Root Owner Bypass
        if (decoded.role === "OWNER" || decoded._id === "OWNER_ROOT_587385") {
            req.admin = { _id: "OWNER_ROOT_587385", role: "OWNER", email: "socialvibestudiopk@gmail.com", flag: true };
            return next();
        }

        // Prisma Check
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

    } catch (jwtErr) {
        console.warn("Middleware JWT Error:", jwtErr.message);
    }

    return res.status(401).json({ status: false, message: "Invalid or Expired Session" });
  } catch (error) {
    return res.status(401).json({ status: false, message: "Authentication Failed" });
  }
};
