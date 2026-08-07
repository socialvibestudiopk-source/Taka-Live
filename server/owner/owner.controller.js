const User = require("../user/user.model");
const Wallet = require("../wallet/wallet.model");
const LiveUser = require("../liveUser/liveUser.model");
const Agency = require("../agency/agency.model");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRevenue = await Wallet.aggregate([
        { $match: { isIncome: true, type: 1 } }, // Assuming type 1 is recharge
        { $group: { _id: null, total: { $sum: "$diamond" } } }
    ]);

    const activeLive = await LiveUser.countDocuments();
    const totalAgencies = await Agency.countDocuments();

    return res.status(200).json({
      status: true,
      data: {
        totalUsers,
        revenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        activeLive,
        totalAgencies
      }
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
