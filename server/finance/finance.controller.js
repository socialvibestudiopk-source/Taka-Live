const User = require("../user/user.model");
const Wallet = require("../wallet/wallet.model");
const CoinPlan = require("../coinPlan/coinPlan.model");
const moment = require("moment");

exports.analytics = async (req, res) => {
  try {
    const today = moment().startOf("day");

    const totalRevenue = await Wallet.aggregate([
      { $match: { type: 1, isIncome: true } }, // Assuming type 1 is recharge
      { $group: { _id: null, total: { $sum: "$diamond" } } }
    ]);

    const todayRevenue = await Wallet.aggregate([
      { $match: { type: 1, isIncome: true, createdAt: { $gte: today.toDate() } } },
      { $group: { _id: null, total: { $sum: "$diamond" } } }
    ]);

    // Monthly data for chart
    const monthData = await Wallet.aggregate([
      { $match: { type: 1, isIncome: true, createdAt: { $gte: moment().subtract(30, 'days').toDate() } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$diamond" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
        status: true,
        message: "Success",
        analytics: {
            totalRevenue: totalRevenue[0]?.total || 0,
            todayRevenue: todayRevenue[0]?.total || 0,
            chartData: monthData
        }
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.transactions = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const transactions = await Wallet.find()
      .populate("userId", "name username image uniqueId")
      .sort({ createdAt: -1 })
      .skip((start - 1) * limit)
      .limit(limit);

    const total = await Wallet.countDocuments();

    return res.status(200).json({ status: true, message: "Success", transactions, total });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
