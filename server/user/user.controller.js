const User = require("./user.model");
const supabase = require("../../supabase"); // Supabase Client
const prisma = require("../../prisma"); // Prisma Client
const Follower = require("../follower/follower.model");
const Setting = require("../setting/setting.model");
const Wallet = require("../wallet/wallet.model");
const Level = require("../level/level.model");
const LiveUser = require("../liveUser/liveUser.model");
const AuditLog = require("../auditLog/auditLog.model");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../../config");
const arrayShuffle = require("shuffle-array");
const { deleteFile } = require("../../util/deleteFile");
const { compressImage } = require("../../util/compressImage");

// Helper to handle BigInt serialization and camelCase mapping for Android
const mapPrismaUser = (user) => {
    if (!user) return null;
    const mapped = {
        ...user,
        _id: user.id,
        uniqueId: user.unique_id ? user.unique_id.toString() : null,
        lastLogin: user.last_login,
        isOnline: user.is_online,
        isBusy: user.is_busy,
        isFake: user.is_fake,
        isBlock: user.is_block,
        referralCode: user.referral_code,
        referralCount: user.referral_count,
        diamond: user.diamond ? Number(user.diamond) : 0,
        rCoin: user.r_coin ? Number(user.r_coin) : 0,
        spentCoin: user.spent_coin ? Number(user.spent_coin) : 0,
        isVIP: user.is_vip,
        profileSetupCompleted: user.profile_setup_completed,
        fcmToken: user.fcm_token,
        createdAt: user.created_at,
        updatedAt: user.updated_at
    };

    delete mapped.unique_id;
    delete mapped.last_login;
    delete mapped.is_online;
    delete mapped.is_busy;
    delete mapped.is_fake;
    delete mapped.is_block;
    delete mapped.referral_code;
    delete mapped.referral_count;
    delete mapped.r_coin;
    delete mapped.spent_coin;
    delete mapped.is_vip;
    delete mapped.profile_setup_completed;
    delete mapped.fcm_token;
    delete mapped.created_at;
    delete mapped.updated_at;

    return mapped;
};

const serialize = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

// 1. search user (Standard)
exports.search = async (req, res) => {
    try {
        const { value, start, limit } = req.body;
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: value, mode: 'insensitive' } },
                    { username: { contains: value, mode: 'insensitive' } }
                ],
                is_block: false
            },
            skip: parseInt(start) || 0,
            take: parseInt(limit) || 20
        });
        return res.status(200).json({ status: true, message: "Success", user: users.map(u => mapPrismaUser(u)) });
    } catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
};

// 2. global search
exports.globalSearch = async (req, res) => {
    try {
        const { value } = req.body;
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: value, mode: 'insensitive' } },
                    { username: { contains: value, mode: 'insensitive' } },
                    // Search by unique_id if value is numeric
                    ...(/^\d+$/.test(value) ? [{ unique_id: BigInt(value) }] : [])
                ]
            },
            take: 20
        });
        return res.status(200).json({ status: true, user: users.map(u => mapPrismaUser(u)) });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// 3. get staff list
exports.getStaffList = async (req, res) => {
  try {
    const staffRoles = ["super_admin", "admin", "agency", "bd", "bd_leader", "coins_seller", "manager", "OFFICIAL_OWNER"];
    const staff = await prisma.user.findMany({
        where: { role: { in: staffRoles } },
        orderBy: { created_at: 'desc' }
    });
    return res.status(200).json({ status: true, message: "Success (Prisma)", staff: staff.map(u => mapPrismaUser(u)) });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 4. update user role
exports.updateRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const updated = await prisma.user.update({ where: { id: userId }, data: { role: role } });
    return res.status(200).json({ status: true, message: "Role updated", user: mapPrismaUser(updated) });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 5. get users list (index)
exports.index = async (req, res) => {
  try {
    const start = parseInt(req.query.start) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "ALL";
    const skip = (start - 1) * limit;

    const where = { is_fake: req.query.type === "Fake" };
    if (search !== "ALL") {
        where.OR = [
            { username: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } }
        ];
    }
    const [sUsers, totalCount] = await Promise.all([
        prisma.user.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
        prisma.user.count({ where })
    ]);
    return res.status(200).json({ status: true, total: totalCount, user: sUsers.map(u => mapPrismaUser(u)) });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 6. user signup and login
exports.loginSignup = async (req, res) => {
  try {
    const { identity, email, fcmToken, loginType, name, username, image } = req.body;
    if (!identity) return res.status(200).json({ status: false, message: "Identity Required" });

    let sUser = await prisma.user.findFirst({
        where: { OR: [{ identity: identity }, { email: email || "NULL_EMAIL" }] }
    });

    if (sUser) {
        if (sUser.is_block) return res.status(200).json({ status: false, message: "Account Blocked!" });
        sUser = await prisma.user.update({
            where: { id: sUser.id },
            data: { fcm_token: fcmToken || sUser.fcm_token, last_login: new Date(), is_online: true }
        });
        const token = jwt.sign({ _id: sUser.id, role: sUser.role }, config.JWT_SECRET);
        return res.status(200).json({ status: true, message: "Success", user: mapPrismaUser(sUser), token });
    }

    const uniqueId = Math.floor(Math.random() * 90000000) + 10000000;
    const referralCode = "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();

    sUser = await prisma.user.create({
        data: {
            unique_id: BigInt(uniqueId),
            identity,
            email,
            name: name || "User",
            username: username || "user_" + uniqueId,
            image,
            login_type: loginType || 0,
            referral_code: referralCode,
            is_online: true,
            last_login: new Date()
        }
    });

    const token = jwt.sign({ _id: sUser.id, role: sUser.role }, config.JWT_SECRET);
    return res.status(200).json({ status: true, message: "Registration Success", user: mapPrismaUser(sUser), token });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 7. Taka ID Login
exports.takaLogin = async (req, res) => {
  try {
    const { takaId, password, fcmToken } = req.body;
    const sUser = await prisma.user.findFirst({ where: { OR: [{ username: takaId }, { email: takaId }] } });
    if (sUser && sUser.password && bcrypt.compareSync(password, sUser.password)) {
        const updated = await prisma.user.update({
            where: { id: sUser.id },
            data: { fcm_token: fcmToken || sUser.fcm_token, is_online: true, last_login: new Date() }
        });
        const token = jwt.sign({ _id: sUser.id, role: sUser.role }, config.JWT_SECRET);
        return res.status(200).json({ status: true, message: "Login Success", user: mapPrismaUser(updated), token });
    }
    return res.status(200).json({ status: false, message: "Invalid ID or Password" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 8. get profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.query.userId || req.user?._id;
        const sUser = await prisma.user.findUnique({ where: { id: userId } });
        if (sUser) return res.status(200).json({ status: true, user: mapPrismaUser(sUser) });
        return res.status(200).json({ status: false, message: "User not found" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// 9. block unblock
exports.blockUnblock = async (req, res) => {
    try {
        const sUser = await prisma.user.findUnique({ where: { id: req.params.userId } });
        if (sUser) {
            const updated = await prisma.user.update({ where: { id: sUser.id }, data: { is_block: !sUser.is_block } });
            return res.status(200).json({ status: true, user: mapPrismaUser(updated) });
        }
        return res.status(200).json({ status: false, message: "User not found" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// 10. online
exports.userIsOnline = async (req, res) => {
    try {
        await prisma.user.update({ where: { id: req.body.userId }, data: { is_online: true, is_busy: false } });
        return res.status(200).json({ status: true, message: "Online" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// 11. get by unique id
exports.getByUniqueId = async (req, res) => {
  try {
    const sUser = await prisma.user.findUnique({ where: { unique_id: BigInt(req.query.uniqueId) } });
    if (sUser) return res.status(200).json({ status: true, user: mapPrismaUser(sUser) });
    return res.status(200).json({ status: false, message: "User not found" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 12. get popular
exports.getPopularUser = async (req, res) => {
  try {
    const users = await prisma.user.findMany({ where: { is_block: false }, take: 10 });
    return res.status(200).json({ status: true, top_users: users.map(u => mapPrismaUser(u)) });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 13. random match
exports.randomMatch = async (req, res) => {
  try {
    const users = await prisma.user.findMany({ where: { is_online: true, is_block: false }, take: 1 });
    return res.status(200).json({ status: true, user: users.length > 0 ? mapPrismaUser(users[0]) : {} });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 14. get profile user (for feed)
exports.getProfileUser = async (req, res) => {
    try {
        const { profileUserId, username } = req.body;
        const sUser = await prisma.user.findFirst({ where: profileUserId ? { id: profileUserId } : { username: username } });
        if (!sUser) return res.status(200).json({ status: false, message: "User not found" });
        return res.status(200).json({ status: true, user: mapPrismaUser(sUser) });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// 15. update security
exports.updateSecurity = async (req, res) => {
    try {
        const { userId, value, type } = req.body;
        let data = {};
        if (type === 'password') data.password = bcrypt.hashSync(value, 10);
        else if (type === 'email') data.email = value;
        const updated = await prisma.user.update({ where: { id: userId }, data });
        return res.status(200).json({ status: true, user: mapPrismaUser(updated) });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// 16. check username
exports.checkUsername = async (req, res) => {
    try {
        const count = await prisma.user.count({ where: { username: req.query.username } });
        return res.status(200).json({ status: count === 0, message: count === 0 ? "Available" : "Taken" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// 17. referral
exports.referralCode = async (req, res) => {
    try {
        const { userId } = req.body;
        await prisma.user.update({ where: { id: userId }, data: { is_referral: true } });
        return res.status(200).json({ status: true, message: "Success" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// 18. add/less coins
exports.addLessRcoinDiamond = async (req, res) => {
    try {
        const { userId, amount, type, action } = req.body;
        const val = parseInt(amount);
        const data = {};
        if (type === 'diamond') data.diamond = action === 'add' ? { increment: val } : { decrement: val };
        else data.r_coin = action === 'add' ? { increment: val } : { decrement: val };
        const updated = await prisma.user.update({ where: { id: userId }, data });
        return res.status(200).json({ status: true, user: mapPrismaUser(updated) });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// 19. update profile
exports.updateProfile = async (req, res) => {
    try {
        const { userId, name, username, bio, gender, age, country } = req.body;
        let data = { name, username, bio, gender, age: parseInt(age) || 0, country, profile_setup_completed: true };
        if (req.file) {
            compressImage(req.file);
            data.image = config.SERVER_PATH + req.file.path;
        }
        const updated = await prisma.user.update({ where: { id: userId }, data });
        return res.status(200).json({ status: true, user: mapPrismaUser(updated) });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// 20. Advanced actions
exports.forceLogout = async (req, res) => {
    try {
        await prisma.user.update({ where: { id: req.params.userId }, data: { is_online: false, fcm_token: "" } });
        return res.status(200).json({ status: true, message: "Success" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.changeNumericId = async (req, res) => {
    try {
        await prisma.user.update({ where: { id: req.params.userId }, data: { unique_id: BigInt(req.body.newId) } });
        return res.status(200).json({ status: true, message: "Success" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.grantAsset = async (req, res) => {
    return res.status(200).json({ status: true, message: "Asset Granted" });
};

exports.removeAsset = async (req, res) => {
    return res.status(200).json({ status: true, message: "Asset Removed" });
};

exports.getBDLeaderList = async (req, res) => {
    try {
        const bdLeaders = await prisma.user.findMany({ where: { role: "bd_leader" }, orderBy: { created_at: 'desc' } });
        return res.status(200).json({ status: true, bdLeaders: bdLeaders.map(u => mapPrismaUser(u)) });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.getBDList = async (req, res) => {
    try {
        const bds = await prisma.user.findMany({ where: { role: "bd" }, orderBy: { created_at: 'desc' } });
        return res.status(200).json({ status: true, bds: bds.map(u => mapPrismaUser(u)) });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
