const User = require("../user/user.model");
const LiveUser = require("../liveUser/liveUser.model");
const Wallet = require("../wallet/wallet.model");
const Agency = require("../agency/agency.model");
const Invitation = require("../invitation/invitation.model");
const Withdraw = require("../withdraw/withdraw.model");
const moment = require("moment");
const mongoose = require("mongoose");

const DashboardController = {
    // 1. Standard Dashboard
    dashboard: async (req, res) => {
        try {
            const totalUser = await User.countDocuments();
            const liveUser = await LiveUser.countDocuments();
            return res.status(200).json({ status: true, totalUser, liveUser });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 2. Analytics
    analytic: async (req, res) => {
        return res.status(200).json({ status: true, chartData: [] });
    },

    // 3. Enterprise Owner Stats
    getOwnerStats: async (req, res) => {
        try {
            const startOfToday = moment().startOf("day").toDate();
            const [totalUsers, onlineUsers, liveRooms] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ isOnline: true }),
                LiveUser.countDocuments()
            ]);
            const stats = {
                counters: { totalUsers, onlineUsers, liveRooms, activeHosts: 0, activeAgencies: 0 },
                wallet: { totalCoins: 0, totalDiamonds: 0 },
                system: { backend: "CONNECTED", database: "CONNECTED" }
            };
            return res.status(200).json({ status: true, data: stats });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    }
};

module.exports = DashboardController;
