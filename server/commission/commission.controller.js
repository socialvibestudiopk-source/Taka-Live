const Commission = require("./commission.model");
const AuditLog = require("../auditLog/auditLog.model");

exports.index = async (req, res) => {
  try {
    const commissions = await Commission.find().sort({ role: 1 });
    return res.status(200).json({ status: true, message: "Success", data: commissions });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.store = async (req, res) => {
  try {
    const commission = new Commission(req.body);
    await commission.save();

    // Audit Log
    const log = new AuditLog();
    log.adminId = req.admin ? req.admin._id : null;
    log.action = "Create Commission";
    log.details = `Created ${commission.role} commission: ${commission.value}${commission.type === 'percentage' ? '%' : ''}`;
    await log.save();

    return res.status(200).json({ status: true, message: "Commission created", data: commission });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(200).json({ status: false, message: "Not found" });

    const oldValue = commission.value;
    Object.assign(commission, req.body);
    await commission.save();

    // Audit Log
    const log = new AuditLog();
    log.adminId = req.admin ? req.admin._id : null;
    log.action = "Update Commission";
    log.details = `Updated ${commission.role} commission from ${oldValue} to ${commission.value}`;
    await log.save();

    return res.status(200).json({ status: true, message: "Updated", data: commission });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
