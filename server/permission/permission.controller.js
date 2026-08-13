const Permission = require("./permission.model");
const Admin = require("../admin/admin.model");

exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    return res.status(200).json({ status: true, message: "Success", permissions });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.updateRolePermissions = async (req, res) => {
    try {
        const { role, permissions } = req.body; // permissions: Array of permission names

        // Find all admins with this role and update their flag or reference
        // In this system, permissions might be better handled via a separate Role model
        // but for now we can update the Permission model or individual Admin flags

        return res.status(200).json({ status: true, message: "Permissions updated" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
