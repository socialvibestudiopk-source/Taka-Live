const User = require("./user.model");
const prisma = require("../../prisma");
const config = require("../../config");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const arrayShuffle = require("shuffle-array");
const { compressImage } = require("../../util/compressImage");

// Helper to check if string is a valid UUID (Required for Supabase/Prisma)
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

// Mapping helper for Android App (Snake Case -> Camel Case)
const mapUser = (user) => {
    if (!user) return null;
    return {
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
};

const serialize = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

const UserController = {
    // 🛡️ Login Signup (Quick Start + standard)
    loginSignup: async (req, res) => {
        try {
            const { identity, email, fcmToken, name, username, image, loginType } = req.body;
            if (!identity) return res.status(200).json({ status: false, message: "Identity Required" });

            // 1. Try Supabase (Prisma)
            const whereClause = { OR: [{ identity }] };
            if (email && email.trim() !== "" && email !== "NULL") whereClause.OR.push({ email });

            let sUser = await prisma.user.findFirst({ where: whereClause });

            if (sUser) {
                if (sUser.is_block) return res.status(200).json({ status: false, message: "Account Blocked!" });

                sUser = await prisma.user.update({
                    where: { id: sUser.id },
                    data: { fcm_token: fcmToken || sUser.fcm_token, last_login: new Date(), is_online: true }
                });
                const token = jwt.sign({ _id: sUser.id, role: sUser.role }, config.JWT_SECRET || "TAKAlive_JWT_Secret_Key_587385");
                return res.status(200).json({ status: true, message: "Success", user: mapUser(sUser), token });
            }

            // 2. Try Mongo Fallback
            let mUser = await User.findOne({ $or: [{ identity }, { email: email || "QUICK_USER" }] });
            if (mUser) {
                const token = jwt.sign({ _id: mUser._id.toString(), role: mUser.role }, config.JWT_SECRET);
                return res.status(200).json({ status: true, user: mUser, token });
            }

            // 3. Create New Quick Account (Supabase First)
            const uniqueId = Math.floor(Math.random() * 90000000) + 10000000;
            const referralCode = "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();

            sUser = await prisma.user.create({
                data: {
                    unique_id: BigInt(uniqueId),
                    identity: identity,
                    email: (email && email !== "NULL") ? email : null,
                    name: name || "Taka Explorer",
                    username: username || "user_" + uniqueId,
                    image: image || "",
                    login_type: loginType || 3,
                    referral_code: referralCode,
                    is_online: true,
                    last_login: new Date(),
                    profile_setup_completed: false
                }
            });

            const token = jwt.sign({ _id: sUser.id, role: sUser.role }, config.JWT_SECRET || "TAKAlive_JWT_Secret_Key_587385");
            return res.status(200).json({ status: true, message: "Registration Success", user: mapUser(sUser), token });

        } catch (error) {
            console.error("loginSignup Error:", error.message);
            return res.status(500).json({ status: false, error: "Internal Server Error: " + error.message });
        }
    },

    // 🔒 Taka ID Login
    takaLogin: async (req, res) => {
        try {
            const { takaId, password, fcmToken } = req.body;
            const user = await prisma.user.findFirst({ where: { OR: [{ username: takaId }, { email: takaId }] } });
            if (user && user.password && bcrypt.compareSync(password, user.password)) {
                const updated = await prisma.user.update({
                    where: { id: user.id },
                    data: { fcm_token: fcmToken, is_online: true, last_login: new Date() }
                });
                const token = jwt.sign({ _id: user.id, role: user.role }, config.JWT_SECRET || "TAKAlive_JWT_Secret_Key_587385");
                return res.status(200).json({ status: true, message: "Login Success", user: mapUser(updated), token });
            }
            // Mongo Fallback
            const mUser = await User.findOne({ $or: [{ username: takaId }, { email: takaId }] });
            if (mUser && mUser.password && bcrypt.compareSync(password, mUser.password)) {
                 const token = jwt.sign({ _id: mUser._id.toString(), role: mUser.role }, config.JWT_SECRET);
                 return res.status(200).json({ status: true, user: mUser, token });
            }
            return res.status(200).json({ status: false, message: "Invalid ID or Password" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // Standard profile/index methods
    getProfile: async (req, res) => {
        try {
            const userId = req.query.userId || req.user?._id;
            if (isUUID(userId)) {
                const user = await prisma.user.findUnique({ where: { id: userId } });
                if (user) return res.status(200).json({ status: true, user: mapUser(user) });
            }
            const mUser = await User.findById(userId).populate("level");
            if (mUser) return res.status(200).json({ status: true, user: mUser });
            return res.status(200).json({ status: false, message: "User not found" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    index: async (req, res) => {
        try {
            const users = await prisma.user.findMany({ take: 10, orderBy: { created_at: 'desc' } });
            return res.status(200).json({ status: true, user: users.map(u => mapUser(u)) });
        } catch (error) {
            const mUsers = await User.find().limit(10).sort({ createdAt: -1 });
            return res.status(200).json({ status: true, user: mUsers });
        }
    },

    userIsOnline: async (req, res) => {
        try {
            const { userId } = req.body;
            if (isUUID(userId)) await prisma.user.update({ where: { id: userId }, data: { is_online: true, is_busy: false } });
            else await User.updateOne({ _id: userId }, { isOnline: true, isBusy: false });
            return res.status(200).json({ status: true, message: "Success" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    search: async (req, res) => {
        try {
            const { value } = req.body;
            const users = await prisma.user.findMany({ where: { OR: [{ name: { contains: value, mode: 'insensitive' } }, { username: { contains: value, mode: 'insensitive' } }] }, take: 20 });
            return res.status(200).json({ status: true, user: users.map(u => mapUser(u)) });
        } catch (e) { return res.status(500).json({ status: false, error: e.message }); }
    },

    // Standard list methods
    getStaffList: async (req, res) => {
        try {
            const staff = await prisma.user.findMany({ where: { role: { in: ["super_admin", "admin", "agency", "bd", "bd_leader", "coins_seller", "manager", "OFFICIAL_OWNER"] } } });
            return res.status(200).json({ status: true, staff: staff.map(u => mapUser(u)) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // Placeholders
    globalSearch: async (req, res) => { return res.status(200).json({ status: true, user: [] }); },
    getProfileUser: async (req, res) => { return res.status(200).json({ status: true, user: {} }); },
    updateSecurity: async (req, res) => { return res.status(200).json({ status: true, user: {} }); },
    referralCode: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    addLessRcoinDiamond: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    updateProfile: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    blockUnblock: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    updateRole: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    getBDLeaderList: async (req, res) => { return res.status(200).json({ status: true, bdLeaders: [] }); },
    getBDList: async (req, res) => { return res.status(200).json({ status: true, bds: [] }); },
    getByUniqueId: async (req, res) => { return res.status(200).json({ status: true, user: {} }); },
    forceLogout: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    changeNumericId: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    grantAsset: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    removeAsset: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); }
};

module.exports = UserController;
