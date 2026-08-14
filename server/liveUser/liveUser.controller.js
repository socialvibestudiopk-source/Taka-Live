const LiveUser = require("./liveUser.model");
const User = require("../user/user.model");
const prisma = require("../../prisma");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const fcm = require("../../util/fcm");

const mapLiveUser = (live) => {
    if (!live) return null;
    return {
        ...live,
        _id: live.id,
        liveUserId: live.live_user_id,
        liveStreamingId: live.live_history_id,
        agoraUID: live.agora_uid,
        isVIP: live.is_vip,
        isPublic: live.is_public,
        rCoin: live.r_coin ? Number(live.r_coin) : 0,
        diamond: live.diamond ? Number(live.diamond) : 0
    };
};

const LiveUserController = {
    // 1. Check if user is live
    checkLive: async (req, res) => {
        try {
            const live = await prisma.liveUser.findFirst({ where: { live_user_id: req.query.userId } });
            if (live) return res.status(200).json({ status: true, liveUser: mapLiveUser(live) });
            return res.status(200).json({ status: false, message: "Not live" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 2. User is live (Start session)
    userIsLive: async (req, res) => {
        try {
            const { userId, channel, agoraUID } = req.body;
            const sUser = await prisma.user.findUnique({ where: { id: userId } });
            if (!sUser) return res.status(200).json({ status: false, message: "User not found" });

            const history = await prisma.liveStreamingHistory.create({ data: { user_id: userId, start_time: new Date() } });
            const live = await prisma.liveUser.create({
                data: {
                    live_user_id: userId,
                    name: sUser.name,
                    username: sUser.username,
                    channel,
                    agora_uid: Number(agoraUID) || 0,
                    live_history_id: history.id
                }
            });
            await prisma.user.update({ where: { id: userId }, data: { is_busy: true } });
            return res.status(200).json({ status: true, liveUser: mapLiveUser(live) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 3. Get Live Users
    getLiveUser: async (req, res) => {
        try {
            const lives = await prisma.liveUser.findMany({ include: { user: true }, take: 20 });
            return res.status(200).json({ status: true, users: lives.map(l => mapLiveUser(l)) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 4. Terminate Session
    terminateAudioSession: async (req, res) => {
        try {
            const userId = req.query.userId;
            await prisma.liveUser.deleteMany({ where: { live_user_id: userId } });
            await prisma.user.update({ where: { id: userId }, data: { is_busy: false } });
            return res.status(200).json({ status: true, message: "Terminated" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 5. Generate Agora Token
    generateToken: async (req, res) => {
        try {
            return res.status(200).json({ status: true, token: "RTC_TOKEN_PLACEHOLDER" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    }
};

module.exports = LiveUserController;
