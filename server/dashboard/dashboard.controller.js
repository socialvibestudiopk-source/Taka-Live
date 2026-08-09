const User = require("../user/user.model");
const LiveUser = require("../liveUser/liveUser.model");
const Wallet = require("../wallet/wallet.model");
const Agency = require("../agency/agency.model");
const Invitation = require("../invitation/invitation.model");
const Withdraw = require("../withdraw/withdraw.model"); // Assuming this exists
const moment = require("moment");
const mongoose = require("mongoose");

exports.getOwnerStats = async (req, res) => {
  try {
    const startOfToday = moment().startOf("day").toDate();
    const endOfToday = moment().endOf("day").toDate();

    const [
        totalUsers,
        onlineUsers,
        newUsersToday,
        liveRooms,
        activeHosts,
        activeAgencies,
        activeBDs,
        activeBDLeaders,
        superAdmins,
        managers,
        coinsSellers,
        pendingWithdrawals,
        pendingInvitations,
        bannedUsers,
        totalCoins,
        totalDiamonds,
        activeVIPs
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isOnline: true }),
        User.countDocuments({ createdAt: { $gte: startOfToday } }),
        LiveUser.countDocuments(),
        User.countDocuments({ role: "host", hostStatus: "ACTIVE" }),
        Agency.countDocuments({ status: true }),
        User.countDocuments({ role: "bd" }),
        User.countDocuments({ role: "bd_leader" }),
        User.countDocuments({ role: "super_admin" }),
        User.countDocuments({ role: "manager" }),
        User.countDocuments({ role: "coins_seller" }),
        Withdraw.countDocuments({ status: "pending" }).catch(() => 0),
        Invitation.countDocuments({ status: "PENDING" }),
        User.countDocuments({ isBlock: true }),
        User.aggregate([{ $group: { _id: null, sum: { $sum: "$diamond" } } }]).then(res => res[0]?.sum || 0),
        User.aggregate([{ $group: { _id: null, sum: { $sum: "$rCoin" } } }]).then(res => res[0]?.sum || 0),
        User.countDocuments({ isVIP: true })
    ]);

    // Revenue Calculation (From Wallet / Recharge)
    const revenueStats = await Wallet.aggregate([
        { $match: { isIncome: true, type: { $in: [1, 2, 3] } } }, // Assuming 1,2,3 are recharge types
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$diamond" }, // or whatever field represents the actual money/coins
                todayRevenue: {
                    $sum: {
                        $cond: [
                            { $gte: ["$createdAt", startOfToday] },
                            "$diamond",
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const stats = {
      counters: {
        totalUsers,
        onlineUsers,
        newUsersToday,
        liveRooms,
        activeHosts,
        activeAgencies,
        activeBDs,
        activeBDLeaders,
        superAdmins,
        managers,
        coinsSellers,
        pendingWithdrawals,
        pendingInvitations,
        bannedUsers,
        activeVIPs
      },
      wallet: {
        totalCoins,
        totalDiamonds,
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        todayRevenue: revenueStats[0]?.todayRevenue || 0
      },
      system: {
          backend: "CONNECTED",
          database: mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED",
          status: "HEALTHY",
          timestamp: new Date()
      }
    };

    return res.status(200).json({ status: true, data: stats });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({ status: false, error: error.message });
  }
};
