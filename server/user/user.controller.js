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

// Helper to handle BigInt serialization in JSON
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
                user: serialize(sUsers)
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
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get popular user by its follower count
exports.getPopularUser = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res
        .send(200)
        .json({ status: false, message: "userId is required" });
    }

    const user = await User.findById(req.query.userId);
    if (!user) {
      return res.status(200).json({ status: false, message: "User not found" });
    }

    const followerIds = await Follower.find({ fromUserId: user._id }).distinct(
      "toUserId"
    );

    const top_users = await User.find({ _id: { $nin: followerIds } })
      .sort({
        followers: -1,
      })
      .limit(10);

    return res
      .status(200)
      .json({ status: true, message: "Success!!", top_users });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// user signup and login (Enterprise Grade with Firebase Verification)
exports.loginSignup = async (req, res) => {
  try {
    const { identity, email, fcmToken, loginType, name, username, image, idToken, password } = req.body;

    if (!identity || (!email && loginType != 2))
      return res.status(200).json({ status: false, message: "Invalid Details!", user: {} });

    // Optional: Verify Google ID Token if provided
    if (loginType == 0 && idToken && isFirebaseInitialized) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            if (decodedToken.email !== email) throw new Error("Token mismatch");
        } catch (e) {
            return res.status(200).json({ status: false, message: "Google verification failed" });
        }
    }

    // --- SUPABASE SYNC ---
    const { data: sUser, error: sUserError } = await supabase
        .from('users')
        .select('*')
        .or(`identity.eq.${identity},email.eq.${email}`)
        .single();

    if (sUser) {
        if (sUser.is_block) return res.status(200).json({ status: false, message: "Account Blocked (Supabase)!" });

        await supabase.from('users').update({
            fcm_token: fcmToken || sUser.fcm_token,
            last_login: new Date().toISOString(),
            is_online: true
        }).eq('id', sUser.id);

        const token = jwt.sign({ _id: sUser.id, role: sUser.role }, config.JWT_SECRET);
        return res.status(200).json({ status: true, message: "Success (Supabase)!!", user: sUser, token });
    }

    // Legacy MongoDB check
    let user = await User.findOne({
        $or: [{ identity: identity }, { email: email }]
    }).populate("level");

    if (user) {
      if (user.isBlock) return res.status(200).json({ status: false, message: "Account Blocked!" });

      user.fcmToken = fcmToken || user.fcmToken;
      user.lastLogin = new Date().toLocaleString();
      user.isOnline = true;
      await user.save();

      // MIGRATION: If user exists in Mongo but not Supabase, create in Supabase
      const { data: migratedUser } = await supabase.from('users').insert({
          identity: user.identity,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image,
          role: user.role,
          diamond: user.diamond,
          r_coin: user.rCoin,
          unique_id: user.uniqueId,
          is_online: true,
          last_login: new Date().toISOString()
      }).select().single();

      const token = jwt.sign({ _id: user._id, role: user.role }, config.JWT_SECRET);
      return res.status(200).json({ status: true, message: "Success (Migrated)!!", user, token });
    }

    // Handle Signup (Brand New User)
    const uniqueId = Math.floor(Math.random() * 90000000) + 10000000;
    const referralCode = "REF" + Math.random().toString(36).substring(2, 10).toUpperCase();

    // 1. Create in Supabase
    const { data: supabaseUser, error: supabaseError } = await supabase.from('users').insert({
        unique_id: uniqueId,
        identity,
        email,
        name,
        username: username || "user_" + Math.floor(Math.random() * 10000),
        image,
        login_type: loginType,
        referral_code: referralCode,
        is_online: true,
        last_login: new Date().toISOString()
    }).select().single();

    // 2. Create in MongoDB (Keep synced for now)
    const newUser = new User();
    newUser.uniqueId = uniqueId;
    newUser.lastLogin = new Date().toLocaleString();
    newUser.isOnline = true;
    newUser.loginType = loginType;
    newUser.identity = identity;
    newUser.email = email;
    newUser.name = name;
    newUser.username = username || "user_" + Math.floor(Math.random() * 10000);
    newUser.image = image;
    newUser.referralCode = referralCode;

    if (password) newUser.password = bcrypt.hashSync(password, 10);

    await newUser.save();

    const token = jwt.sign({ _id: newUser._id, role: newUser.role }, config.JWT_SECRET);
    return res.status(200).json({ status: true, message: "Registration Success!!", user: newUser, token });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// Security: Link/Update methods
exports.updateSecurity = async (req, res) => {
    try {
        const { userId, type, value, password } = req.body; // type: 'email', 'phone', 'password'
        const user = await User.findById(userId);
        if (!user) return res.status(200).json({ status: false, message: "User not found" });

        if (type === 'email') {
            const emailExist = await User.findOne({ email: value, _id: { $ne: user._id } });
            if (emailExist) return res.status(200).json({ status: false, message: "Email already linked to another account" });
            user.email = value;
        } else if (type === 'password') {
            user.password = bcrypt.hashSync(value, 10);
        } else if (type === 'phone') {
            // phone logic
            user.identity = value; // or a dedicated phone field
        }

        await user.save();
        return res.status(200).json({ status: true, message: "Security updated successfully", user });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Taka ID Custom Login
exports.takaLogin = async (req, res) => {
  try {
    if (!req.body.takaId || !req.body.password)
      return res.status(200).json({ status: false, message: "Invalid Details!" });

    const user = await User.findOne({
        $or: [{ username: req.body.takaId }, { email: req.body.takaId }]
    }).populate("level");

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not exist!" });
    }

    if (!user.password) {
      return res.status(200).json({ status: false, message: "This account doesn't have a password set. Try Google login." });
    }

    const isPasswordValid = bcrypt.compareSync(req.body.password, user.password);
    if (!isPasswordValid) {
      return res.status(200).json({ status: false, message: "Invalid password!" });
    }

    user.fcmToken = req.body.fcmToken || user.fcmToken;
    user.lastLogin = new Date().toLocaleString();
    user.isOnline = true;
    await user.save();

    return res.status(200).json({ status: true, message: "Login Success!", user });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

const userFunction = async (user, data) => {
  user.name = data.name ? data.name : user.name;
  user.gender = data.gender ? data.gender : user.gender;
  user.age = data.age ? data.age : user.age;
  user.image =
    data.image === ""
      ? data.gender.toLowerCase() === "female"
        ? `${config.SERVER_PATH}storage/female.png`
        : `${config.SERVER_PATH}storage/male.png`
      : data.image;
  user.country = data.country;
  user.ip = data.ip;
  user.identity = data.identity;
  user.loginType = data.loginType;
  user.username = data.username ? data.username : user.username;
  user.email = data.email;
  user.fcmToken = data.fcmToken;
  user.lastLogin = new Date().toLocaleString();

  await user.save();

  return user;
};

// check username is already exist or not
exports.checkUsername = async (req, res) => {
  try {
    if (!req.query.username)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!" });

    // const user = await User.findById(req.query.userId);

    // if (!user)
    //   return res
    //     .status(200)
    //     .json({ status: false, message: "User Does Not Exist !" });

    // if (user.username === req.query.username) {
    //   return res.status(200).json({
    //     status: true,
    //     message: "Username generated successfully!",
    //   });
    // }
    User.findOne({
      username: { $regex: req.query.username, $options: "i" },
    }).exec((error, user) => {
      if (error)
        return res
          .status(200)
          .json({ status: false, message: "Internal Server Error" });
      else {
        if (user) {
          return res
            .status(200)
            .json({ status: false, message: "Username already taken!" });
        } else
          return res.status(200).json({
            status: true,
            message: "Username generated successfully!",
          });
      }
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// get profile of user who login
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.query.userId);
    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!", user: {} });

    const follower = await Follower.find({
      toUserId: user._id.toString(),
    }).countDocuments();

    const following = await Follower.find({
      fromUserId: user._id.toString(),
    }).countDocuments();

    if (user.plan.planId !== null && user.plan.planStartDate !== null) {
      const user_ = await checkPlan(user._id);
      return res
        .status(200)
        .json({ status: true, message: "success", user: user_ });
    }

    const user_ = await updateLevel(user._id);

    user_.followers = follower;
    user_.following = following;

    return res
      .status(200)
      .json({ status: true, message: "Success!!", user: user_ });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Server Error",
      user: "",
    });
  }
};

// update profile of user
exports.updateProfile = async (req, res) => {
  try {
    console.log("edit body", req.body);
    const user = await User.findById(req.body.userId).populate("level");

    if (!user)
      return res.status(200).json({
        status: false,
        message: "User does not Exist!",
        user: {},
      });

    if (req.file) {
      if (fs.existsSync(user.image)) {
        fs.unlinkSync(user.image);
      }

      // compress image
      compressImage(req.file);

      user.image = config.SERVER_PATH + req.file.path;
    }
    // else {
    //   user.image =
    //     req.body.gender.toLowerCase() === "female"
    //       ? `${config.SERVER_PATH}storage/female.png`
    //       : `${config.SERVER_PATH}storage/male.png`;
    // }

    user.name = req.body.name ? req.body.name : user.name;
    user.username = req.body.username ? req.body.username : user.username;
    user.bio = req.body.bio ? req.body.bio : user.bio;
    user.gender = req.body.gender ? req.body.gender : user.gender;
    user.age = req.body.age ? req.body.age : user.age;
    user.country = req.body.country ? req.body.country : user.country;

    if (req.body.role) {
        user.role = req.body.role;
    }
    if (req.body.isVerified !== undefined) {
        user.isVerified = req.body.isVerified === "true" || req.body.isVerified === true;
    }

    if (req.body.profileSetupCompleted) {
        user.profileSetupCompleted = req.body.profileSetupCompleted === "true";
    }

    if (req.body.dob) {
        // Calculate age from DOB string (Expected format: DD/MM/YYYY)
        const parts = req.body.dob.split("/");
        if (parts.length === 3) {
            const birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
            const ageDate = new Date(Date.now() - birthDate.getTime());
            user.age = Math.abs(ageDate.getUTCFullYear() - 1970);
        }
    }

    await user.save();

    const data = await User.findById(user._id).populate("level");

    // Add extra computed fields for mobile app compatibility
    const responseUser = data.toObject();
    responseUser.isCoinSeller = data.role === "coins_seller";
    responseUser.isAgency = data.role === "agency";
    responseUser.isHost = data.role === "host";

    return res.status(200).json({ status: true, message: "Success!!", user: responseUser });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Server Error",
      user: {},
    });
  }
};

// get user profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.query.userId || req.user._id;
        const user = await User.findById(userId).populate("level");
        if (!user) return res.status(200).json({ status: false, message: "User not found" });

        const data = user.toObject();
        data.isCoinSeller = user.role === "coins_seller";
        data.isAgency = user.role === "agency";
        data.isHost = user.role === "host";

        return res.status(200).json({ status: true, message: "Success", user: data });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
}

// get user profile of post[feed]
exports.getProfileUser = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    let query;

    if (req.body.profileUserId) {
      query = {
        _id: req.body.profileUserId,
      };
    } else {
      query = {
        username: req.body.username,
      };
    }

    const profileUser = await User.findOne({ ...query })
      .populate("level")
      .select(
        "name username gender age image country bio followers following video post level isVIP"
      );

    if (!profileUser)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    var isFollow = false;
    const isFollowExist = await Follower.exists({
      fromUserId: user._id,
      toUserId: profileUser._id,
    });

    if (isFollowExist) {
      isFollow = true;
    }

    return res.status(200).json({
      status: true,
      message: "Success!!",
      user: { ...profileUser._doc, userId: profileUser._id, isFollow },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// Global Search (User + Rooms)
exports.globalSearch = async (req, res) => {
  try {
    const { value, start, limit, userId } = req.body;
    const skip = parseInt(start) || 0;
    const limitNum = parseInt(limit) || 20;

    const searchQuery = {
      $or: [
        { name: { $regex: value, $options: "i" } },
        { username: { $regex: value, $options: "i" } },
        { uniqueId: { $regex: value, $options: "i" } },
      ],
    };

    const users = await User.find(searchQuery)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Check live status for each user
    const userIds = users.map((u) => u._id);
    const liveRooms = await LiveUser.find({ liveUserId: { $in: userIds } }).lean();

    const results = users.map((user) => {
      const room = liveRooms.find((r) => r.liveUserId.toString() === user._id.toString());
      return {
        ...user,
        isLive: !!room,
        roomInfo: room || null,
      };
    });

    return res.status(200).json({ status: true, message: "Success", user: results });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// search user by name and username
exports.search = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    const response = await User.aggregate([
      {
        $match: {
          $and: [
            { _id: { $ne: user._id } },
            { isBlock: false },
            {
              $or: [
                { name: { $regex: req.body.value, $options: "i" } },
                { username: { $regex: req.body.value, $options: "i" } },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: "followers",
          localField: "_id",
          foreignField: "toUserId",
          as: "follower",
        },
      },
      {
        $unwind: {
          path: "$follower",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "levels",
          localField: "level",
          foreignField: "_id",
          as: "level",
        },
      },
      {
        $unwind: {
          path: "$level",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          name: 1,
          username: 1,
          gender: 1,
          age: 1,
          image: 1,
          country: 1,
          bio: 1,
          followers: 1,
          following: 1,
          video: 1,
          post: 1,
          level: 1,
          isVIP: 1,
          isFollow: {
            $cond: {
              if: { $eq: [user._id, "$follower.fromUserId"] },
              then: true,
              else: false,
            },
          },
        },
      },
      { $group: { _id: "$_id", user: { $first: "$$ROOT" } } },
      {
        $project: {
          _id: 1,
          userId: "$user._id",
          name: "$user.name",
          username: "$user.username",
          gender: "$user.gender",
          age: "$user.age",
          image: "$user.image",
          country: "$user.country",
          bio: "$user.bio",
          followers: "$user.followers",
          following: "$user.following",
          video: "$user.video",
          post: "$user.post",
          level: "$user.level",
          isVIP: "$user.isVIP",
          isFollow: "$user.isFollow",
        },
      },
      {
        $facet: {
          user: [
            { $skip: req.body.start ? parseInt(req.body.start) : 0 }, // how many records you want to skip
            { $limit: req.body.limit ? parseInt(req.body.limit) : 20 },
          ],
        },
      },
    ]);

    return res
      .status(200)
      .json({ status: true, message: "Success!!", user: response[0].user });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

//check referral code is valid and add referral bonus
exports.referralCode = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.referralCode)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!!", user: {} });

    const user = await User.findById(req.body.userId).populate("level");

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!!", user: {} });

    if (user.referralCode === req.body.referralCode.trim())
      return res.status(200).json({
        status: false,
        message: "You can't use your own Referral Code!",
        user: {},
      });

    const referralCodeUser = await User.findOne({
      referralCode: req.body.referralCode,
    });

    if (!referralCodeUser)
      return res.status(200).json({
        status: false,
        message: "Referral Code is not Exist!!",
        user: {},
      });

    const setting = await Setting.findOne({});
    if (!user.isReferral) {
      user.isReferral = true;
      user.diamond += setting ? setting.referralBonus : 0;
      user.save();

      referralCodeUser.rCoin += setting ? setting.referralBonus : 0;
      referralCodeUser.referralCount += 1;
      referralCodeUser.save();

      const income = new Wallet();

      income.userId = referralCodeUser._id;
      income.rCoin = setting ? setting.referralBonus : 0;
      income.type = 6;
      income.otherUserId = user._id;
      income.date = new Date().toLocaleString();

      await income.save();

      income.userId = user._id;
      income.diamond = setting ? setting.referralBonus : 0;
      income.type = 6;
      income.otherUserId = referralCodeUser._id;
      income.date = new Date().toLocaleString();

      await income.save();

      return res.status(200).json({ status: true, message: "Success!!", user });
    }

    return res.status(200).json({
      status: false,
      message: "User already used a Referral Code!!",
      user: {},
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// get user by numeric unique ID
exports.getByUniqueId = async (req, res) => {
  try {
    const { uniqueId } = req.query;
    if (!uniqueId) return res.status(200).json({ status: false, message: "ID is required" });

    const user = await User.findOne({ uniqueId: parseInt(uniqueId) }).populate("level charmLevel");
    if (!user) return res.status(200).json({ status: false, message: "User not found" });

    return res.status(200).json({ status: true, message: "Success", user });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// block unblock user
exports.blockUnblock = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    user.isBlock = !user.isBlock;

    await user.save();

    return res.status(200).json({ status: true, message: "Success!!", user });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// online the user
exports.userIsOnline = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    }

    user.isOnline = true;
    user.isBusy = false;

    await user.save();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// offline the user
exports.offlineUser = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (user) {
      user.isOnline = false;
      user.isBusy = false;
      user.token = null;
      user.channel = null;

      await user.save();

      await LiveUser.findOneAndDelete({ liveUserId: user._id });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// get random match for call
exports.randomMatch = async (req, res) => {
  try {
    const user = await User.findById(req.query.userId).populate("level");
    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    const setting = await Setting.findOne({});

    const users = await User.find({
      _id: { $ne: user._id },
      loginType: { $ne: 3 },
      isOnline: true,
      isBusy: false,
      isFake: false,
    })
      .populate("level")
      .select(
        "name username gender age image country bio followers following video isFake post level isVIP loginType"
      );

    const shuffleUser = await arrayShuffle(users);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      user:
        shuffleUser.length > 0
          ? {
              ...shuffleUser[0]._doc,
              userId: shuffleUser[0]._id,
            }
          : {},
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// admin add or less the rCoin or diamond of user through admin panel
exports.addLessRcoinDiamond = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    const amount = parseInt(req.body.amount);
    const type = req.body.type; // diamond or rCoin
    const action = req.body.action; // add or less
    const reason = req.body.reason || "Manual Adjustment by Owner";

    if (isNaN(amount) || amount <= 0) {
      return res.status(200).json({ status: false, message: "Invalid Amount" });
    }

    const wallet = new Wallet();
    wallet.userId = user._id;
    wallet.date = new Date().toLocaleString();
    wallet.type = 8; // Manual adjustment type

    if (type === "diamond") {
      if (action === "add") {
        user.diamond += amount;
        wallet.diamond = amount;
        wallet.isIncome = true;
      } else {
        if (user.diamond < amount) return res.status(200).json({ status: false, message: "Insufficient Balance" });
        user.diamond -= amount;
        wallet.diamond = amount;
        wallet.isIncome = false;
      }
    } else if (type === "rCoin") {
      if (action === "add") {
        user.rCoin += amount;
        wallet.rCoin = amount;
        wallet.isIncome = true;
      } else {
        if (user.rCoin < amount) return res.status(200).json({ status: false, message: "Insufficient Balance" });
        user.rCoin -= amount;
        wallet.rCoin = amount;
        wallet.isIncome = false;
      }
    }

    await user.save();
    await wallet.save();

    // Create Audit Log Entry
    const auditLog = new AuditLog({
      adminId: req.admin?._id || null,
      action: "WALLET_ADJUSTMENT",
      details: `${action.toUpperCase()} ${amount} ${type} to user ${user.uniqueId}. Reason: ${reason}`,
      ip: req.ip
    });
    await auditLog.save();

    return res.status(200).json({ status: true, message: "Success!!", user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//check user plan is expired or not
const checkPlan = async (userId, res) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not exist!!" });
    }

    await updateLevel(user._id);

    if (user.plan.planStartDate !== null && user.plan.planId !== null) {
      const plan = await VIPPlan.findById(user.plan.planId);
      if (!plan) {
        return res
          .status(200)
          .json({ status: false, message: "Plan does not exist!!" });
      }

      if (plan.validityType.toLowerCase() === "day") {
        const diffTime = moment(new Date()).diff(
          moment(new Date(user.plan.planStartDate)),
          "day"
        );
        if (diffTime > plan.validity) {
          user.isVIP = false;
          user.plan.planStartDate = null;
          user.plan.planId = null;
        }
      }
      if (plan.validityType.toLowerCase() === "month") {
        const diffTime = moment(new Date()).diff(
          moment(new Date(user.plan.planStartDate)),
          "month"
        );
        if (diffTime >= plan.validity) {
          user.isVIP = false;
          user.plan.planStartDate = null;
          user.plan.planId = null;
        }
      }
      if (plan.validityType.toLowerCase() === "year") {
        const diffTime = moment(new Date()).diff(
          moment(new Date(user.plan.planStartDate)),
          "year"
        );
        if (diffTime >= plan.validity) {
          user.isVIP = false;
          user.plan.planStartDate = null;
          user.plan.planId = null;
        }
      }
    }

    await user.save();

    const user_ = await User.findById(userId).populate("level");
    return user_;
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error });
  }
};

// update level of user
exports.updateLevel = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const levels = await Level.find().sort({ coin: -1 });

    // Wealth Level (spentCoin)
    for (let data of levels) {
      if (user.spentCoin >= data.coin) {
        user.level = data._id;
        break;
      }
    }

    // Charm Level (rCoin)
    for (let data of levels) {
        if (user.rCoin >= data.coin) {
          user.charmLevel = data._id;
          break;
        }
    }

    await user.save();
    return await User.findById(userId).populate("level charmLevel");
  } catch (error) {
    console.log(error);
  }
};

// update user role
exports.updateRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!!" });
    }

    const oldRole = user.role;
    user.role = req.body.role;

    // reset enterprise fields if changing roles significantly
    if (["bd", "bd_leader", "agency"].includes(req.body.role)) {
        user.region = req.body.region || user.region;
        user.commission = req.body.commission || user.commission;
    }

    await user.save();

    // Apply Role Asset Rules
    const AssetController = require("../asset/asset.controller");
    await AssetController.applyRoleAssetRules(user._id, user.role);

    return res.status(200).json({
      status: true,
      message: `User promoted from ${oldRole} to ${user.role} successfully!`,
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// force logout user from all devices
exports.forceLogout = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(200).json({ status: false, message: "User not found" });

    user.fcmToken = ""; // Clear token so notifications stop
    user.token = null;  // Clear session token if stored
    user.isOnline = false;
    await user.save();

    return res.status(200).json({ status: true, message: "User forced to logout successfully" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// grant asset to user (Frame or Badge)
exports.grantAsset = async (req, res) => {
  try {
    const { userId, assetId, assetType } = req.body; // assetType: 'frame' or 'badge'
    if (!userId || !assetId || !assetType) return res.status(200).json({ status: false, message: "Missing required fields" });

    const user = await User.findById(userId);
    if (!user) return res.status(200).json({ status: false, message: "User not found" });

    if (!user.inventory) {
        user.inventory = { frames: [], badges: [], bubbles: [], entranceEffects: [], vehicles: [] };
    }

    if (assetType === 'frame') {
        if (user.inventory.frames.includes(assetId)) return res.status(200).json({ status: false, message: "User already has this frame" });
        user.inventory.frames.push(assetId);
    } else if (assetType === 'badge') {
        if (user.inventory.badges.includes(assetId)) return res.status(200).json({ status: false, message: "User already has this badge" });
        user.inventory.badges.push(assetId);
    } else {
        return res.status(200).json({ status: false, message: "Invalid asset type" });
    }

    await user.save();
    return res.status(200).json({ status: true, message: "Asset granted successfully", user });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// remove asset from user
exports.removeAsset = async (req, res) => {
  try {
    const { userId, assetId, assetType } = req.body;
    const user = await User.findById(userId);
    if (!user || !user.inventory) return res.status(200).json({ status: false, message: "User or inventory not found" });

    if (assetType === 'frame') {
        user.inventory.frames = user.inventory.frames.filter(id => id.toString() !== assetId);
    } else if (assetType === 'badge') {
        user.inventory.badges = user.inventory.badges.filter(id => id.toString() !== assetId);
    }

    await user.save();
    return res.status(200).json({ status: true, message: "Asset removed successfully", user });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// change user numeric ID (Special ID assignment)
exports.changeNumericId = async (req, res) => {
  try {
    const { newId } = req.body;
    if (!newId) return res.status(200).json({ status: false, message: "New ID is required" });

    const idExist = await User.findOne({ uniqueId: newId });
    if (idExist) return res.status(200).json({ status: false, message: "This ID is already assigned to someone else" });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(200).json({ status: false, message: "User not found" });

    user.uniqueId = newId;
    await user.save();

    return res.status(200).json({ status: true, message: "Unique ID updated successfully", user });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Enterprise: Get BD Leader List
exports.getBDLeaderList = async (req, res) => {
    try {
        const bdLeaders = await User.find({ role: "bd_leader" })
            .select("name username image uniqueId commission region lastLogin createdAt")
            .lean();

        // Enrich with counts
        const enrichedList = await Promise.all(bdLeaders.map(async (leader) => {
            const bdCount = await User.countDocuments({ role: "bd", bdLeaderId: leader._id });
            return { ...leader, bdCount };
        }));

        return res.status(200).json({ status: true, message: "Success", bdLeaders: enrichedList });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Enterprise: Get BD List
exports.getBDList = async (req, res) => {
    try {
        const { bdLeaderId } = req.query;
        let query = { role: "bd" };
        if (bdLeaderId) query.bdLeaderId = bdLeaderId;

        const bds = await User.find(query)
            .select("name username image uniqueId commission region bdLeaderId lastLogin createdAt")
            .populate("bdLeaderId", "name uniqueId")
            .lean();

        // Enrich with agency counts
        const Agency = require("../agency/agency.model");
        const enrichedList = await Promise.all(bds.map(async (bd) => {
            const agencyCount = await Agency.countDocuments({ bdId: bd._id });
            return { ...bd, agencyCount };
        }));

        return res.status(200).json({ status: true, message: "Success", bds: enrichedList });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
