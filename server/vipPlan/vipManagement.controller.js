const VIPConfig = require("./vipConfig.model");
const VIPPlan = require("./vipPlan.model");
const VIPReward = require("./vipReward.model");
const VIPPlanHistory = require("./vipPlanHistory.model");
const User = require("../user/user.model");
const AuditLog = require("../auditLog/auditLog.model");

// Get VIP Config
exports.getConfig = async (req, res) => {
  try {
    let config = await VIPConfig.findOne({});
    if (!config) {
      config = new VIPConfig();
      await config.save();
    }
    return res.status(200).json({ status: true, message: "Success", config });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Update VIP Config
exports.updateConfig = async (req, res) => {
  try {
    const config = await VIPConfig.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    return res.status(200).json({ status: true, message: "Updated successfully", config });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Get Levels
exports.getLevels = async (req, res) => {
  try {
    const levels = await VIPPlan.find({ isDelete: false }).sort({ level: 1 });
    return res.status(200).json({ status: true, message: "Success", levels });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Add Level
exports.addLevel = async (req, res) => {
  try {
    const level = new VIPPlan(req.body);
    await level.save();
    return res.status(200).json({ status: true, message: "Level added", level });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Edit Level
exports.editLevel = async (req, res) => {
    try {
      const level = await VIPPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
      return res.status(200).json({ status: true, message: "Level updated", level });
    } catch (error) {
      return res.status(500).json({ status: false, error: error.message });
    }
};

// Delete Level
exports.deleteLevel = async (req, res) => {
    try {
      await VIPPlan.findByIdAndUpdate(req.params.id, { isDelete: true });
      return res.status(200).json({ status: true, message: "Level deleted" });
    } catch (error) {
      return res.status(500).json({ status: false, error: error.message });
    }
};

// Get Rewards
exports.getRewards = async (req, res) => {
  try {
    const rewards = await VIPReward.find({}).sort({ vipLevel: 1, sortOrder: 1 });
    return res.status(200).json({ status: true, message: "Success", rewards });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Add Reward
exports.addReward = async (req, res) => {
  try {
    const reward = new VIPReward(req.body);
    await reward.save();
    return res.status(200).json({ status: true, message: "Reward added", reward });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Edit Reward
exports.editReward = async (req, res) => {
  try {
    const reward = await VIPReward.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json({ status: true, message: "Reward updated", reward });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Delete Reward
exports.deleteReward = async (req, res) => {
  try {
    await VIPReward.findByIdAndDelete(req.params.id);
    return res.status(200).json({ status: true, message: "Reward deleted" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Get Overview/Stats
exports.getOverview = async (req, res) => {
  try {
    const totalVipUsers = await User.countDocuments({ isVIP: true });
    const levelStats = await User.aggregate([
      { $match: { isVIP: true } },
      { $group: { _id: "$plan.planId", count: { $sum: 1 } } }
    ]);

    // Revenue logic based on VIPPlanHistory
    const revenue = await VIPPlanHistory.aggregate([
        { $group: { _id: null, total: { $sum: "$dollar" } } } // Assuming dollar field exists or needs lookup
    ]);

    return res.status(200).json({
        status: true,
        message: "Success",
        stats: { totalVipUsers, levelStats, totalRevenue: revenue[0] ? revenue[0].total : 0 }
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Get VIP Users
exports.getVipUsers = async (req, res) => {
  try {
    const users = await User.find({ isVIP: true }).select("name username image uniqueId plan").populate("plan.planId");
    return res.status(200).json({ status: true, message: "Success", users });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Assign VIP manually
exports.assignVip = async (req, res) => {
  try {
    const { userId, planId, duration } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(200).json({ status: false, message: "User not found" });

    user.isVIP = true;
    user.plan.planId = planId;
    user.plan.planStartDate = new Date().toLocaleString();
    await user.save();

    // Audit Log
    const log = new AuditLog({
      action: "MANUAL_VIP_ASSIGN",
      details: `Assigned VIP Plan ${planId} to user ${user.uniqueId}`,
      adminId: req.admin?._id
    });
    await log.save();

    return res.status(200).json({ status: true, message: "VIP assigned successfully", user });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Remove VIP manually
exports.removeVip = async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await User.findById(userId);
      if (!user) return res.status(200).json({ status: false, message: "User not found" });

      user.isVIP = false;
      user.plan.planId = null;
      user.plan.planStartDate = null;
      await user.save();

      // Audit Log
      const log = new AuditLog({
        action: "MANUAL_VIP_REMOVE",
        details: `Removed VIP from user ${user.uniqueId}`,
        adminId: req.admin?._id
      });
      await log.save();

      return res.status(200).json({ status: true, message: "VIP removed successfully", user });
    } catch (error) {
      return res.status(500).json({ status: false, error: error.message });
    }
  };
