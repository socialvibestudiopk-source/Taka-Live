const Wallet = require("../wallet/wallet.model");
const User = require("../user/user.model");
const Agency = require("../agency/agency.model");
const moment = require("moment");

exports.getFinanceAnalytics = async (req, res) => {
  try {
    const today = moment().startOf("day");

    // Revenue aggregates
    const revenue = await Wallet.aggregate([
        { $match: { isIncome: true, diamond: { $ne: null } } },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$diamond" },
                todayRevenue: {
                    $sum: {
                        $cond: [
                            { $gte: [{ $toDate: "$createdAt" }, today.toDate()] },
                            "$diamond",
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const chartData = await Wallet.aggregate([
        { $match: { isIncome: true, diamond: { $ne: null } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                revenue: { $sum: "$diamond" }
            }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
    ]);

    return res.status(200).json({
        status: true,
        analytics: {
            totalRevenue: revenue[0]?.totalRevenue || 0,
            todayRevenue: revenue[0]?.todayRevenue || 0,
            chartData
        }
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.getTransactionHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const transactions = await Wallet.find()
            .populate("userId", "name image uniqueId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Wallet.countDocuments();

        return res.status(200).json({ status: true, transactions, total, page, limit });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
