const User = require("./user.model");
const prisma = require("../../prisma");
const config = require("../../config");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const arrayShuffle = require("shuffle-array");
const { compressImage } = require("../../util/compressImage");

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
    // 1. Get Users (Index)
    index: async (req, res) => {
        try {
            const start = parseInt(req.query.start) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (start - 1) * limit;
            const where = { is_fake: req.query.type === "Fake" };
            if (req.query.search && req.query.search !== "ALL") {
                where.OR = [
                    { username: { contains: req.query.search, mode: 'insensitive' } },
                    { name: { contains: req.query.search, mode: 'insensitive' } }
                ];
            }
            const [users, total] = await Promise.all([
                prisma.user.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
                prisma.user.count({ where })
            ]);
            return res.status(200).json({ status: true, total, user: users.map(u => mapUser(u)) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 2. Get User By Unique ID
    getByUniqueId: async (req, res) => {
        try {
            const user = await prisma.user.findUnique({ where: { unique_id: BigInt(req.query.uniqueId) } });
            if (!user) return res.status(200).json({ status: false, message: "User not found" });
            return res.status(200).json({ status: true, user: mapUser(user) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 3. Get Popular Users
    getPopularUser: async (req, res) => {
        try {
            const users = await prisma.user.findMany({ where: { is_block: false }, take: 10 });
            return res.status(200).json({ status: true, top_users: users.map(u => mapUser(u)) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 4. Get User Profile
    getProfile: async (req, res) => {
        try {
            const userId = req.query.userId || req.user?._id;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return res.status(200).json({ status: false, message: "User not found" });
            return res.status(200).json({ status: true, user: mapUser(user) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 5. Random Match
    randomMatch: async (req, res) => {
        try {
            const users = await prisma.user.findMany({ where: { is_online: true, is_block: false }, take: 50 });
            const shuffled = arrayShuffle(users);
            return res.status(200).json({ status: true, user: shuffled.length > 0 ? mapUser(shuffled[0]) : {} });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 6. User Is Online
    userIsOnline: async (req, res) => {
        try {
            await prisma.user.update({ where: { id: req.body.userId }, data: { is_online: true, is_busy: false } });
            return res.status(200).json({ status: true, message: "Success" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 7. Search
    search: async (req, res) => {
        try {
            const { value, start, limit } = req.body;
            const users = await prisma.user.findMany({
                where: { OR: [{ name: { contains: value, mode: 'insensitive' } }, { username: { contains: value, mode: 'insensitive' } }], is_block: false },
                skip: parseInt(start) || 0,
                take: parseInt(limit) || 20
            });
            return res.status(200).json({ status: true, user: users.map(u => mapUser(u)) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 8. Global Search
    globalSearch: async (req, res) => {
        try {
            const { value } = req.body;
            const users = await prisma.user.findMany({
                where: { OR: [{ name: { contains: value, mode: 'insensitive' } }, { username: { contains: value, mode: 'insensitive' } }] },
                take: 20
            });
            return res.status(200).json({ status: true, user: users.map(u => mapUser(u)) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 9. Get Profile User (for others)
    getProfileUser: async (req, res) => {
        try {
            const { profileUserId, username } = req.body;
            const user = await prisma.user.findFirst({ where: profileUserId ? { id: profileUserId } : { username: username } });
            if (!user) return res.status(200).json({ status: false, message: "User not found" });
            return res.status(200).json({ status: true, user: mapUser(user) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 10. Login Signup
    loginSignup: async (req, res) => {
        try {
            const { identity, email, fcmToken, name, username, image } = req.body;
            let user = await prisma.user.findFirst({ where: { OR: [{ identity }, { email: email || "NULL" }] } });
            if (user) {
                user = await prisma.user.update({ where: { id: user.id }, data: { fcm_token: fcmToken, last_login: new Date(), is_online: true } });
                const token = jwt.sign({ _id: user.id, role: user.role }, config.JWT_SECRET);
                return res.status(200).json({ status: true, user: mapUser(user), token });
            }
            const uniqueId = Math.floor(Math.random() * 90000000) + 10000000;
            user = await prisma.user.create({ data: { unique_id: BigInt(uniqueId), identity, email, name: name || "User", username: username || "user_" + uniqueId, image, is_online: true, last_login: new Date() } });
            const token = jwt.sign({ _id: user.id, role: user.role }, config.JWT_SECRET);
            return res.status(200).json({ status: true, user: mapUser(user), token });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 11. Taka Login
    takaLogin: async (req, res) => {
        try {
            const { takaId, password, fcmToken } = req.body;
            const user = await prisma.user.findFirst({ where: { OR: [{ username: takaId }, { email: takaId }] } });
            if (user && user.password && bcrypt.compareSync(password, user.password)) {
                const updated = await prisma.user.update({ where: { id: user.id }, data: { fcm_token: fcmToken, is_online: true, last_login: new Date() } });
                const token = jwt.sign({ _id: user.id, role: user.role }, config.JWT_SECRET);
                return res.status(200).json({ status: true, user: mapUser(updated), token });
            }
            return res.status(200).json({ status: false, message: "Invalid Credentials" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 12. Update Security
    updateSecurity: async (req, res) => {
        try {
            const { userId, value, type } = req.body;
            const data = type === 'password' ? { password: bcrypt.hashSync(value, 10) } : { email: value };
            const updated = await prisma.user.update({ where: { id: userId }, data });
            return res.status(200).json({ status: true, user: mapUser(updated) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 13. Check Username
    checkUsername: async (req, res) => {
        try {
            const count = await prisma.user.count({ where: { username: req.query.username } });
            return res.status(200).json({ status: count === 0, message: count === 0 ? "Available" : "Taken" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 14. Referral Code
    referralCode: async (req, res) => {
        try {
            await prisma.user.update({ where: { id: req.body.userId }, data: { is_referral: true } });
            return res.status(200).json({ status: true, message: "Success" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 15. Add/Less Coin
    addLessRcoinDiamond: async (req, res) => {
        try {
            const { userId, amount, type, action } = req.body;
            const val = parseInt(amount);
            const data = type === 'diamond' ? { diamond: action === 'add' ? { increment: val } : { decrement: val } } : { r_coin: action === 'add' ? { increment: val } : { decrement: val } };
            const updated = await prisma.user.update({ where: { id: userId }, data });
            return res.status(200).json({ status: true, user: mapUser(updated) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 16. Update Profile
    updateProfile: async (req, res) => {
        try {
            const { userId, name, username, bio, gender, age, country } = req.body;
            const data = { name, username, bio, gender, age: parseInt(age) || 0, country, profile_setup_completed: true };
            if (req.file) { data.image = config.SERVER_PATH + req.file.path; }
            const updated = await prisma.user.update({ where: { id: userId }, data });
            return res.status(200).json({ status: true, user: mapUser(updated) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 17. Force Logout
    forceLogout: async (req, res) => {
        try {
            await prisma.user.update({ where: { id: req.params.userId }, data: { is_online: false, fcm_token: "" } });
            return res.status(200).json({ status: true, message: "Logged out" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 18. Change Numeric ID
    changeNumericId: async (req, res) => {
        try {
            await prisma.user.update({ where: { id: req.params.userId }, data: { unique_id: BigInt(req.body.newId) } });
            return res.status(200).json({ status: true, message: "ID Changed" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 19. Grant/Remove Assets (Placeholders)
    grantAsset: async (req, res) => { return res.status(200).json({ status: true, message: "Asset Granted" }); },
    removeAsset: async (req, res) => { return res.status(200).json({ status: true, message: "Asset Removed" }); },

    // 20. Block/Unblock
    blockUnblock: async (req, res) => {
        try {
            const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
            const updated = await prisma.user.update({ where: { id: user.id }, data: { is_block: !user.is_block } });
            return res.status(200).json({ status: true, user: mapUser(updated) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 21. Update Role
    updateRole: async (req, res) => {
        try {
            const updated = await prisma.user.update({ where: { id: req.params.userId }, data: { role: req.body.role } });
            return res.status(200).json({ status: true, user: mapUser(updated) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 22. Staff & BD Lists
    getStaffList: async (req, res) => {
        try {
            const staff = await prisma.user.findMany({ where: { role: { in: ["super_admin", "admin", "agency", "bd", "bd_leader", "coins_seller", "manager", "OFFICIAL_OWNER"] } }, orderBy: { created_at: 'desc' } });
            return res.status(200).json({ status: true, staff: staff.map(u => mapUser(u)) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },
    getBDLeaderList: async (req, res) => {
        try {
            const users = await prisma.user.findMany({ where: { role: "bd_leader" }, orderBy: { created_at: 'desc' } });
            return res.status(200).json({ status: true, bdLeaders: users.map(u => mapUser(u)) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },
    getBDList: async (req, res) => {
        try {
            const users = await prisma.user.findMany({ where: { role: "bd" }, orderBy: { created_at: 'desc' } });
            return res.status(200).json({ status: true, bds: users.map(u => mapUser(u)) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    }
};

module.exports = UserController;
