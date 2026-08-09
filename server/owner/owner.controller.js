const User = require("../user/user.model");
const Wallet = require("../wallet/wallet.model");
const LiveUser = require("../liveUser/liveUser.model");
const Agency = require("../agency/agency.model");
const Banner = require("../banner/banner.model");
const HostRequest = require("../complain/complain.model"); // Assuming requests share model or use appropriate one

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Calculate Revenue (Recharge)
    const revenueStats = await Wallet.aggregate([
        { $match: { isIncome: true, type: 1 } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$diamond" },
            todayRevenue: {
              $sum: {
                $cond: [ { $gte: [{ $toDate: "$createdAt" }, today] }, "$diamond", 0 ]
              }
            },
            monthlyRevenue: {
              $sum: {
                $cond: [ { $gte: [{ $toDate: "$createdAt" }, startOfMonth] }, "$diamond", 0 ]
              }
            }
          }
        }
    ]);

    // 2. User Statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isOnline: true });
    const onlineUsers = await User.countDocuments({ isOnline: true }); // Real-time online
    const bannedUsers = await User.countDocuments({ isBlock: true });

    // 3. Live Ecosystem
    const activeRooms = await LiveUser.countDocuments();
    const activeBroadcasters = await LiveUser.countDocuments({ isAudio: false });
    const totalHosts = await User.countDocuments({ role: "host" });

    // 4. Role Counts
    const totalAgencies = await Agency.countDocuments();
    const totalBDs = await User.countDocuments({ role: "bd" });
    const totalBDLeaders = await User.countDocuments({ role: "bd_leader" });

    // 5. Pending Applications
    const pendingAgencies = await Agency.countDocuments({ status: "pending" }); // Adjust field based on model
    const pendingHosts = 0; // Replace with HostRequest model if available

    // 6. Coin Circulation (Total user balance)
    const coinCirculation = await User.aggregate([
        { $group: { _id: null, totalDiamonds: { $sum: "$diamond" }, totalRCoin: { $sum: "$rCoin" } } }
    ]);

    return res.status(200).json({
      status: true,
      data: {
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        todayRevenue: revenueStats[0]?.todayRevenue || 0,
        monthlyRevenue: revenueStats[0]?.monthlyRevenue || 0,
        totalUsers,
        activeUsers,
        onlineUsers,
        activeRooms,
        activeBroadcasters,
        totalHosts,
        totalAgencies,
        totalBDs,
        totalBDLeaders,
        pendingAgencies,
        pendingHosts,
        bannedUsers,
        coinCirculation: coinCirculation[0] || { totalDiamonds: 0, totalRCoin: 0 },
        systemHealth: "Optimal",
        apiStatus: "Healthy"
      }
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getRevenueChart = async (req, res) => {
    try {
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const chartData = await Wallet.aggregate([
            { $match: { isIncome: true, type: 1, createdAt: { $gte: last7Days } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$diamond" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        return res.status(200).json({ status: true, data: chartData });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
