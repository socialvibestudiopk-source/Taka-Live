const ROLE_ALIASES = {
  owner: "OWNER",
  official_owner: "OFFICIAL_OWNER",
  super_admin: "SUPER_ADMIN",
  superadmin: "SUPER_ADMIN",
  manager: "MANAGER",
  admin: "ADMIN",
  bd_leader: "BD_LEADER",
  bd: "BD",
  agency: "AGENCY",
  host: "HOST",
  coin_seller: "COIN_SELLER",
};

function normalizeRole(role) {
  if (!role) return "ADMIN";
  return ROLE_ALIASES[String(role).trim().toLowerCase()] || String(role).trim().toUpperCase();
}

function hasRole(admin, allowedRoles) {
  return Boolean(admin && allowedRoles.includes(normalizeRole(admin.role)));
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!hasRole(req.admin, allowedRoles)) {
      return res.status(403).json({ status: false, message: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { normalizeRole, hasRole, requireRole };
