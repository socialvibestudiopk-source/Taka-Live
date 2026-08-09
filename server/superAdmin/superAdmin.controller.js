const User = require("../user/user.model");
const Agency = require("../agency/agency.model");
const Invitation = require("../invitation/invitation.model");
const AuditLog = require("../auditLog/auditLog.model");
const crypto = require("crypto");

// Command Center Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = {
      bdLeaders: await User.countDocuments({ role: "bd_leader" }),
      bds: await User.countDocuments({ role: "bd" }),
      agencies: await User.countDocuments({ role: "agency" }),
      pendingRequests: await Invitation.countDocuments({ status: "PENDING" }),
      bannedUsers: await User.countDocuments({ isBlock: true }),
      serverInfo: {
          serverId: "TAKA-GLB-01",
          responseTime: "42ms",
          status: "ACTIVE"
      }
    };
    return res.status(200).json({ status: true, message: "Success", stats });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Lists with Search & Filter
exports.getBDList = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = { role: "bd" };
    if (search) query.name = { $regex: search, $options: "i" };
    if (status) query.status = status; // Assuming we add a status field or use isBlock

    const bds = await User.find(query).select("name image uniqueId role region assignedAgencyCount commission isBlock");
    return res.status(200).json({ status: true, bds });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.getAgencyList = async (req, res) => {
    try {
      const { search } = req.query;
      let query = {};
      if (search) query.name = { $regex: search, $options: "i" };

      const agencies = await Agency.find(query).populate("ownerId", "name image").populate("bdId", "name");
      return res.status(200).json({ status: true, agencies });
    } catch (error) {
      return res.status(500).json({ status: false, error: error.message });
    }
};

exports.getBDLeaderList = async (req, res) => {
    try {
      const { search } = req.query;
      let query = { role: "bd_leader" };
      if (search) query.name = { $regex: search, $options: "i" };

      const leaders = await User.find(query).select("name image uniqueId role region assignedBDCount assignedAgencyCount commission");
      return res.status(200).json({ status: true, leaders });
    } catch (error) {
      return res.status(500).json({ status: false, error: error.message });
    }
};

// Invitations
exports.createInvitation = async (req, res) => {
  try {
    const { role, contact, name, region, commission, message, bdLeaderId, bdId } = req.body;

    const token = crypto.randomBytes(20).toString("hex");
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 48); // 48 hour expiry

    const invitation = new Invitation({
      token,
      role,
      contact,
      name,
      region,
      commission,
      message,
      bdLeaderId,
      bdId,
      senderId: req.admin._id,
      senderRole: req.admin.role,
      expiryDate
    });

    await invitation.save();

    // Log Action
    const log = new AuditLog({
        adminId: req.admin._id,
        action: `INVITE_${role.toUpperCase()}`,
        details: `Invited ${name} (${contact}) as ${role}`,
        ip: req.ip
    });
    await log.save();

    const inviteLink = `https://taka-live.onrender.com/join/${token}`; // Dummy base URL
    return res.status(200).json({ status: true, message: "Invitation sent successfully", inviteLink, invitation });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// User Banning
exports.banUser = async (req, res) => {
  try {
    const { userId, reason, duration } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(200).json({ status: false, message: "User not found" });

    user.isBlock = true;
    user.fcmToken = ""; // Clear token to terminate session
    // Logic for duration can be added here (e.g. setting a release date)

    await user.save();

    // Log Action
    const log = new AuditLog({
        adminId: req.admin._id,
        action: "BAN_USER",
        details: `Banned user ${user.uniqueId}. Reason: ${reason}, Duration: ${duration}`,
        ip: req.ip
    });
    await log.save();

    return res.status(200).json({ status: true, message: "User banned successfully" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
