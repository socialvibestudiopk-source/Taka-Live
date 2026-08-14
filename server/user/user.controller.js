const User = require("./user.model");
const supabase = require("../../supabase"); // Supabase Client
const prisma = require("../../prisma"); // Prisma Client
const sql = require("../../db"); // Direct Postgres Client
const Follower = require("../follower/follower.model");
const Setting = require("../setting/setting.model");
const VIPPlan = require("../vipPlan/vipPlan.model");
const Wallet = require("../wallet/wallet.model");
const Level = require("../level/level.model");
const LiveUser = require("../liveUser/liveUser.model");
const AuditLog = require("../auditLog/auditLog.model");
const { admin, isInitialized: isFirebaseInitialized } = require("../../services/firebaseService");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../../config");
const moment = require("moment");
const arrayShuffle = require("shuffle-array");
const deleteFile = require("../../util/deleteFile");
const { compressImage } = require("../../util/compressImage");
const shuffleArray = require("shuffle-array");

// Helper to handle BigInt serialization and camelCase mapping for Android
const mapPrismaUser = (user) => {
    if (!user) return null;
    const mapped = {
        ...user,
        _id: user.id, // Android expects _id
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

    // Remove snake_case versions
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

// get staff list (Enterprise Owner Panel)
exports.getStaffList = async (req, res) => {
  try {
    const staffRoles = ["super_admin", "admin", "agency", "bd", "bd_leader", "coins_seller", "manager", "OFFICIAL_OWNER"];

    // 1. Try Prisma (Supabase)
    const staff = await prisma.user.findMany({
        where: { role: { in: staffRoles } },
        select: {
            id: true,
            name: true,
            username: true,
            role: true,
            image: true,
            last_login: true,
            is_block: true,
            unique_id: true
        },
        orderBy: { created_at: 'desc' }
    });

    if (staff && staff.length > 0) {
       return res.status(200).json({ status: true, message: "Success (Prisma)", staff: serialize(staff) });
    }

    // 2. Fallback to MongoDB
    const mongoStaff = await User.find({ role: { $in: staffRoles } })
      .select("name username role image lastLogin isBlock uniqueId")
      .sort({ createdAt: -1 });

    return res.status(200).json({ status: true, message: "Success (Legacy)", staff: mongoStaff });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// update user role
exports.updateRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Try Prisma
    try {
        const sUser = await prisma.user.findUnique({ where: { id: userId } });
        if (sUser) {
            const updated = await prisma.user.update({
                where: { id: userId },
                data: { role: role }
            });
            return res.status(200).json({ status: true, message: "Role updated (Prisma)", user: mapPrismaUser(updated) });
        }
    } catch (e) {}

    const user = await User.findById(userId);
    if (!user) return res.status(200).json({ status: false, message: "User not found" });

    user.role = role;
    await user.save();

    return res.status(200).json({ status: true, message: "Role updated successfully (Legacy)", user });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// get users list
exports.index = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const search = req.query.search || "ALL";
    const skip = (start - 1) * limit;

    // --- PRISMA (SUPABASE) ---
    try {
        const where = {
            is_fake: req.query.type === "Fake"
        };

        if (search !== "ALL") {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { gender: { contains: search, mode: 'insensitive' } },
                { country: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [sUsers, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        if (sUsers && sUsers.length > 0) {
            return res.status(200).json({
                status: true,
                message: "Success (Prisma)!!",
                total: totalCount,
                user: sUsers.map(u => mapPrismaUser(u))
            });
        }
    } catch (e) {
        console.warn("Prisma Index Error:", e.message);
    }

    // --- MONGO FALLBACK ---
    let matchQuery = {};
    if (req.query.search != "ALL") {
      matchQuery = {
        $or: [
          { username: { $regex: req.query.search, $options: "i" } },
          { gender: { $regex: req.query.search, $options: "i" } },
          { country: { $regex: req.query.search, $options: "i" } },
        ],
      };
    }

    let query;
    if (req.query.type === "Fake") {
      query = { isFake: true };
    } else {
      query = { isFake: false };
    }

    const user = await User.aggregate([
      { $match: { ...matchQuery, ...query } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          user: [{ $skip: skip }, { $limit: limit }],
          gender: [{ $group: { _id: '$gender', gender: { $sum: 1 } } }],
          activeUser: [{ $group: { _id: '$isOnline', activeUser: { $sum: 1 } } }],
          pageInfo: [{ $group: { _id: null, totalRecord: { $sum: 1 } } }],
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success (Legacy)!!",
      total: user[0].pageInfo.length > 0 ? user[0].pageInfo[0].totalRecord : 0,
      activeUser: user[0].activeUser.length > 0 ? user[0].activeUser[0].activeUser : 0,
      maleFemale: user[0].gender,
      user: user[0].user,
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// user signup and login
exports.loginSignup = async (req, res) => {
  try {
    const { identity, email, fcmToken, loginType, name, username, image, password } = req.body;

    if (!identity || (!email && loginType != 2))
      return res.status(200).json({ status: false, message: "Invalid Details!", user: {} });

    // --- SUPABASE SYNC ---
    const sUser = await prisma.user.findFirst({
        where: { OR: [{ identity: identity }, { email: email }] }
    });

    if (sUser) {
        if (sUser.is_block) return res.status(200).json({ status: false, message: "Account Blocked!" });

        const updatedUser = await prisma.user.update({
            where: { id: sUser.id },
            data: {
                fcm_token: fcmToken || sUser.fcm_token,
                last_login: new Date(),
                is_online: true
            }
        });

        const token = jwt.sign({ _id: sUser.id, role: sUser.role }, config.JWT_SECRET);
        return res.status(200).json({ status: true, message: "Success (Supabase)!!", user: mapPrismaUser(updatedUser), token });
    }

    // Legacy MongoDB check
    let user = await User.findOne({ $or: [{ identity: identity }, { email: email }] }).populate("level");
    if (user) {
      if (user.isBlock) return res.status(200).json({ status: false, message: "Account Blocked!" });

      user.fcmToken = fcmToken || user.fcmToken;
      user.lastLogin = new Date().toLocaleString();
      user.isOnline = true;
      await user.save();

      // MIGRATION
      const migratedUser = await prisma.user.create({
          data: {
              identity: user.identity,
              email: user.email,
              name: user.name,
              username: user.username,
              image: user.image,
              role: user.role,
              unique_id: BigInt(user.uniqueId),
              is_online: true,
              last_login: new Date()
          }
      });

      const token = jwt.sign({ _id: user._id, role: user.role }, config.JWT_SECRET);
      return res.status(200).json({ status: true, message: "Success (Migrated)!!", user: mapPrismaUser(migratedUser), token });
    }

    // Handle Signup
    const uniqueId = Math.floor(Math.random() * 90000000) + 10000000;
    const referralCode = "REF" + Math.random().toString(36).substring(2, 10).toUpperCase();

    const supabaseUser = await prisma.user.create({
        data: {
            unique_id: BigInt(uniqueId),
            identity,
            email,
            name,
            username: username || "user_" + Math.floor(Math.random() * 10000),
            image,
            login_type: loginType,
            referral_code: referralCode,
            is_online: true,
            last_login: new Date()
        }
    });

    const token = jwt.sign({ _id: supabaseUser.id, role: supabaseUser.role }, config.JWT_SECRET);
    return res.status(200).json({ status: true, message: "Registration Success!!", user: mapPrismaUser(supabaseUser), token });

  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Taka ID Login
exports.takaLogin = async (req, res) => {
  try {
    const { takaId, password, fcmToken } = req.body;
    if (!takaId || !password) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const sUser = await prisma.user.findFirst({ where: { OR: [{ username: takaId }, { email: takaId }] } });
    if (sUser && sUser.password && bcrypt.compareSync(password, sUser.password)) {
        const updated = await prisma.user.update({
            where: { id: sUser.id },
            data: { fcm_token: fcmToken || sUser.fcm_token, is_online: true, last_login: new Date() }
        });
        const token = jwt.sign({ _id: sUser.id, role: sUser.role }, config.JWT_SECRET);
        return res.status(200).json({ status: true, message: "Login Success!", user: mapPrismaUser(updated), token });
    }

    return res.status(200).json({ status: false, message: "Invalid ID or Password" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Get BD Leader List
exports.getBDLeaderList = async (req, res) => {
    try {
        const bdLeaders = await prisma.user.findMany({
            where: { role: "bd_leader" },
            select: { id: true, name: true, username: true, image: true, unique_id: true, commission: true, region: true, last_login: true, created_at: true },
            orderBy: { created_at: 'desc' }
        });
        return res.status(200).json({ status: true, message: "Success", bdLeaders: serialize(bdLeaders) });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Get BD List
exports.getBDList = async (req, res) => {
    try {
        const bds = await prisma.user.findMany({
            where: { role: "bd" },
            select: { id: true, name: true, username: true, image: true, unique_id: true, commission: true, region: true, bd_leader_id: true, last_login: true, created_at: true },
            orderBy: { created_at: 'desc' }
        });
        return res.status(200).json({ status: true, message: "Success", bds: serialize(bds) });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// get profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.query.userId || req.user?._id;
        const sUser = await prisma.user.findUnique({ where: { id: userId } });
        if (sUser) return res.status(200).json({ status: true, message: "Success", user: mapPrismaUser(sUser) });
        return res.status(200).json({ status: false, message: "User not found" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.blockUnblock = async (req, res) => {
    try {
        const sUser = await prisma.user.findUnique({ where: { id: req.params.userId } });
        if (sUser) {
            const updated = await prisma.user.update({
                where: { id: sUser.id },
                data: { is_block: !sUser.is_block }
            });
            return res.status(200).json({ status: true, user: mapPrismaUser(updated) });
        }
        return res.status(200).json({ status: false, message: "User not found" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.userIsOnline = async (req, res) => {
    try {
        await prisma.user.update({ where: { id: req.body.userId }, data: { is_online: true, is_busy: false } }).catch(() => {});
        return res.status(200).json({ status: true, message: "Success!!" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
