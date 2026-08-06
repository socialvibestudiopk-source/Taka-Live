const AuditLog = require("./auditLog.model");

exports.index = async (req, res) => {
  try {
    const logs = await AuditLog.find().populate("adminId").sort({ createdAt: -1 }).limit(100);
    return res.status(200).json({ status: true, message: "Success", logs });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.store = async (adminId, action, details, ip) => {
    try {
        const log = new AuditLog({ adminId, action, details, ip });
        await log.save();
    } catch (error) {
        console.error("Failed to store audit log:", error.message);
    }
};
