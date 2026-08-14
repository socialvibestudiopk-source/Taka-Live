const User = require("./user.model");
const prisma = require("../../prisma");
const config = require("../../config");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const arrayShuffle = require("shuffle-array");

// Mapping helper for Android App
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

const UserController = {
    // 🛡️ SIMPLE/QUICK LOGIN (Lower friction for users)
    loginSignup: async (req, res) => {
        try {
            const { identity, email, fcmToken, name, username, image, loginType } = req.body;

            // Check if user exists by identity (Android ID)
            let sUser = await prisma.user.findFirst({
                where: { OR: [{ identity: identity }, { email: email || "QUICK_USER_NO_EMAIL" }] }
            });

            if (sUser) {
                if (sUser.is_block) return res.status(200).json({ status: false, message: "Account Blocked!" });

                sUser = await prisma.user.update({
                    where: { id: sUser.id },
                    data: { fcm_token: fcmToken || sUser.fcm_token, last_login: new Date(), is_online: true }
                });
                const token = jwt.sign({ _id: sUser.id, role: sUser.role }, config.JWT_SECRET);
                return res.status(200).json({ status: true, message: "Welcome Back!", user: mapUser(sUser), token });
            }

            // Create New Quick Account
            const uniqueId = Math.floor(Math.random() * 90000000) + 10000000;
            const referralCode = "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();

            sUser = await prisma.user.create({
                data: {
                    unique_id: BigInt(uniqueId),
                    identity: identity,
                    email: email || null,
                    name: name || "Taka User",
                    username: username || "user_" + uniqueId,
                    image: image || "",
                    login_type: loginType || 3, // 3 = Simple/Quick Login
                    referral_code: referralCode,
                    is_online: true,
                    last_login: new Date(),
                    profile_setup_completed: false // User will complete this later
                }
            });

            const token = jwt.sign({ _id: sUser.id, role: sUser.role }, config.JWT_SECRET);
            return res.status(200).json({ status: true, message: "Quick Account Created!", user: mapUser(sUser), token });

        } catch (error) {
            console.error("Simple Login Error:", error);
            return res.status(500).json({ status: false, error: error.message });
        }
    },

    // 🔒 UPDATE SECURITY (Bind Email/Password/Phone later)
    updateSecurity: async (req, res) => {
        try {
            const { userId, value, type, password } = req.body;
            let updateData = {};

            if (type === 'password') {
                updateData.password = bcrypt.hashSync(value, 10);
            } else if (type === 'email') {
                // Check if email already linked
                const existing = await prisma.user.findFirst({ where: { email: value, NOT: { id: userId } } });
                if (existing) return res.status(200).json({ status: false, message: "Email already in use" });
                updateData.email = value;
            } else if (type === 'phone') {
                updateData.identity = value; // Or dedicated phone field
            }

            const updated = await prisma.user.update({
                where: { id: userId },
                data: updateData
            });

            return res.status(200).json({ status: true, message: "Security settings updated!", user: mapUser(updated) });
        } catch (error) {
            return res.status(500).json({ status: false, error: error.message });
        }
    },

    // Standard methods (index, profile, search, etc.)
    getProfile: async (req, res) => {
        try {
            const user = await prisma.user.findUnique({ where: { id: req.query.userId || req.user?._id } });
            if (!user) return res.status(200).json({ status: false, message: "User not found" });
            return res.status(200).json({ status: true, user: mapUser(user) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    index: async (req, res) => {
        const start = parseInt(req.query.start) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const [users, total] = await Promise.all([
            prisma.user.findMany({ skip: (start - 1) * limit, take: limit, orderBy: { created_at: 'desc' } }),
            prisma.user.count()
        ]);
        return res.status(200).json({ status: true, total, user: users.map(u => mapUser(u)) });
    }
};

module.exports = UserController;
