const User = require("../user/user.model");
const AuditLog = require("../auditLog/auditLog.model");

// update granular permissions for super admin
exports.updatePermissions = async (req, res) => {
  try {
    const { userId, permissions } = req.body;
    if (!userId || !permissions) return res.status(200).json({ status: false, message: "User and permissions required" });

    const user = await User.findById(userId);
    if (!user || user.role !== "super_admin") return res.status(200).json({ status: false, message: "Super Admin not found" });

    // Store permissions in user model or a separate mapping
    user.permissions = permissions;
    await user.save();

    // Log Action
    const log = new AuditLog({
        adminId: req.admin._id,
        action: "UPDATE_PERMISSIONS",
        details: `Updated permissions for Super Admin ${user.uniqueId}`,
        ip: req.ip
    });
    await log.save();

    return res.status(200).json({ status: true, message: "Permissions updated successfully", permissions: user.permissions });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// get current permissions
exports.getPermissions = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        return res.status(200).json({ status: true, permissions: user.permissions || [] });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
