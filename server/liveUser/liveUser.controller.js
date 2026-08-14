const LiveUser = require("./liveUser.model");
const User = require("../user/user.model");
const Setting = require("../setting/setting.model");
const Follower = require("../follower/follower.model");
const LiveStreamingHistory = require("../liveStreamingHistory/liveStreamingHistory.model");
const prisma = require("../../prisma");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

//FCM node
const fcm = require("../../util/fcm");

// Helper to handle BigInt and field mapping for Android App
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

const serialize = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

// Agora token Builder
exports.generateToken = async (req, res) => {
  try {
    if (!req.body.channelName) {
      return res.status(200).json({ status: false, message: "Invalid Details !" });
    }

    const setting = await prisma.setting.findFirst() || await Setting.findOne({});
    if (!setting) return res.status(200).json({ status: false, message: "Setting Not Found" });

    const role = RtcRole.PUBLISHER;
    const account = "0";
    const expirationTimeInSeconds = 24 * 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithAccount(
      setting.agora_key || setting.agoraKey,
      setting.agora_certificate || setting.agoraCertificate,
      req.body.channelName,
      account,
      role,
      privilegeExpiredTs
    );

    return res.status(200).json({ status: true, message: "Success", token });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// live the user
exports.userIsLive = async (req, res) => {
  try {
    const { userId, channel, background, audio, isPublic, agoraUID } = req.body;
    if (!userId || !channel) return res.status(200).json({ status: false, message: "Invalid Details!" });

    // --- PRISMA (SUPABASE) ---
    try {
        const sUser = await prisma.user.findUnique({ where: { id: userId } });
        if (sUser) {
            const existingLive = await prisma.liveUser.findFirst({ where: { live_user_id: userId } });
            if (existingLive) {
                return res.status(200).json({ status: true, message: "Already Live (Prisma)!", liveUser: mapLiveUser(existingLive) });
            }

            const setting = await prisma.setting.findFirst() || await Setting.findOne({});
            const token = await RtcTokenBuilder.buildTokenWithUid(
                setting.agora_key || setting.agoraKey,
                setting.agora_certificate || setting.agoraCertificate,
                channel, Number(agoraUID) || 0, RtcRole.PUBLISHER, Math.floor(Date.now() / 1000) + 3600
            );

            await prisma.user.update({ where: { id: userId }, data: { is_online: true, is_busy: true } });
            const history = await prisma.liveStreamingHistory.create({ data: { user_id: userId, start_time: new Date() } });

            const liveUser = await prisma.liveUser.create({
                data: {
                    live_user_id: userId,
                    name: sUser.name,
                    country: sUser.country,
                    image: sUser.image,
                    username: sUser.username,
                    is_vip: sUser.is_vip,
                    age: sUser.age,
                    token,
                    channel,
                    background,
                    audio: audio === "true" || audio === true,
                    is_public: isPublic === "true" || isPublic === true,
                    live_history_id: history.id,
                    agora_uid: Number(agoraUID) || 0
                }
            });

            return res.status(200).json({ status: true, message: "Success (Prisma)!!", liveUser: mapLiveUser(liveUser) });
        }
    } catch (e) { console.warn("Prisma userIsLive Error:", e.message); }

    // --- MONGO FALLBACK ---
    const user = await User.findById(userId);
    if (!user) return res.status(200).json({ status: false, message: "User not found" });

    const existingLiveMongo = await LiveUser.findOne({ liveUserId: user._id });
    if (existingLiveMongo) {
        return res.status(200).json({ status: true, message: "Already Live!", liveUser: existingLiveMongo });
    }

    const settingMongo = await Setting.findOne({});
    const tokenMongo = await RtcTokenBuilder.buildTokenWithUid(
        settingMongo.agoraKey, settingMongo.agoraCertificate, channel, Number(agoraUID) || 0, RtcRole.PUBLISHER, Math.floor(Date.now() / 1000) + 3600
    );

    user.isOnline = true;
    user.isBusy = true;
    user.token = tokenMongo;
    user.channel = channel;
    await user.save();

    const historyMongo = new LiveStreamingHistory({ userId: user._id, startTime: new Date().toLocaleString() });
    await historyMongo.save();

    const liveUserMongo = new LiveUser({
        liveUserId: user._id,
        name: user.name,
        country: user.country,
        image: user.image,
        username: user.username,
        isVIP: user.isVIP,
        age: user.age,
        token: tokenMongo,
        channel: channel,
        background: background,
        audio: audio === "true" || audio === true,
        isPublic: isPublic === "true" || isPublic === true,
        liveStreamingId: historyMongo._id,
        agoraUID: Number(agoraUID) || 0
    });
    await liveUserMongo.save();

    return res.status(200).json({ status: true, message: "Success (Legacy)!!", liveUser: liveUserMongo });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// check if user is live
exports.checkLive = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(200).json({ status: false, message: "userId required" });

    // Try Prisma
    try {
        const liveUser = await prisma.liveUser.findFirst({
            where: { live_user_id: userId }
        });
        if (liveUser) {
            return res.status(200).json({ status: true, message: "User is Live! (Prisma)", liveUser: mapLiveUser(liveUser) });
        }
    } catch (e) {}

    // Fallback
    const liveUser = await LiveUser.findOne({ liveUserId: userId });
    if (liveUser) {
        return res.status(200).json({ status: true, message: "User is Live! (Legacy)", liveUser });
    }

    return res.status(200).json({ status: false, message: "User is not Live!" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// get live user list
exports.getLiveUser = async (req, res) => {
  try {
    const userId = req.query.userId;
    const start = parseInt(req.query.start) || 0;
    const limit = parseInt(req.query.limit) || 20;

    // --- PRISMA (SUPABASE) ---
    try {
        let where = { is_public: true };
        if (req.query.type === "All") {
            where.live_user_id = { not: userId };
        } else if (req.query.type === "Following") {
            const following = await prisma.follower.findMany({ where: { from_user_id: userId }, select: { to_user_id: true } });
            where.live_user_id = { in: following.map(f => f.to_user_id) };
        }

        const liveUsers = await prisma.liveUser.findMany({
            where,
            include: { user: true },
            orderBy: { created_at: 'desc' },
            skip: start,
            take: limit
        });

        if (liveUsers && liveUsers.length > 0) {
            return res.status(200).json({ status: true, message: "Success (Prisma)!!", users: liveUsers.map(l => mapLiveUser(l)) });
        }
    } catch (e) { console.warn("Prisma getLiveUser Error:", e.message); }

    // --- MONGO FALLBACK ---
    const users = await LiveUser.find({ isPublic: true })
        .populate("liveUserId")
        .sort({ createdAt: -1 })
        .skip(start)
        .limit(limit);

    return res.status(200).json({ status: true, message: "Success (Legacy)!!", users });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// terminate live session
exports.terminateAudioSession = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(200).json({ status: false, message: "userId required" });

    // Try Prisma
    try {
        const liveSession = await prisma.liveUser.findFirst({ where: { live_user_id: userId } });
        if (liveSession) {
            await prisma.user.update({ where: { id: userId }, data: { is_busy: false, is_online: true } });
            await prisma.liveUser.delete({ where: { id: liveSession.id } });
            return res.status(200).json({ status: true, message: "Terminated (Prisma)" });
        }
    } catch (e) {}

    // Fallback
    const liveUser = await LiveUser.findOne({ liveUserId: userId });
    if (liveUser) {
      await User.updateOne({ _id: userId }, { isBusy: false, isOnline: true });
      await liveUser.deleteOne();
      return res.status(200).json({ status: true, message: "Terminated (Legacy)" });
    }

    return res.status(200).json({ status: false, message: "No session found" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
