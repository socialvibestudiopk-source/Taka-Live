require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const supabase = require("./supabase"); // Supabase Client
const app = express();
const path = require("path");
const cors = require("cors");
const config = require("./config");

const corsOptions = {
  origin: ["https://taka-live-owner-panel.vercel.app", "http://localhost:5173"], // Specific Vercel URL
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: ["Content-Type", "Authorization", "key"]
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Static files check - Render Fix
app.use("/storage", express.static(path.join(__dirname, "storage")));

// Redirect root to health check if index.html is missing
app.get("/", (req, res) => {
  res.redirect("/health");
});

// model
const Wallet = require("./server/wallet/wallet.model");
const User = require("./server/user/user.model");
const Follower = require("./server/follower/follower.model");
const LiveUser = require("./server/liveUser/liveUser.model");
const Chat = require("./server/chat/chat.model");
const ChatTopic = require("./server/chatTopic/chatTopic.model");
const LiveStreamingHistory = require("./server/liveStreamingHistory/liveStreamingHistory.model");

// socket io
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server);

// real-time system stats for owner panel
io.on("connection", (socket) => {
    console.log("Socket connected for stats:", socket.id);

    const sendStats = async () => {
        try {
            const stats = {
                onlineUsers: await User.countDocuments({ isOnline: true }),
                liveRooms: await LiveUser.countDocuments({}),
                totalRevenue: 0, // Logic for revenue calculation
                pendingWithdraw: await Wallet.countDocuments({ type: 7, status: "pending" }).catch(() => 0),
                todayRegistration: await User.countDocuments({
                    createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
                })
            };
            socket.emit("statsUpdate", stats);
        } catch (err) {
            console.error("Error sending stats via socket:", err.message);
        }
    };

    // Send immediately and then every 30 seconds
    sendStats();
    const interval = setInterval(sendStats, 30000);

    socket.on("disconnect", () => {
        clearInterval(interval);
    });
});

//FCM node
const fcm = require("./util/fcm");
const { generateCommission } = require("./server/commission/commissionEngine");
const { updateLevel, offlineUser } = require("./server/user/user.controller");

// Routes
app.use("/admin", require("./server/admin/admin.route"));
app.use("/owner", require("./server/owner/owner.route"));
app.use("/commission", require("./server/commission/commission.route"));
app.use("/asset", require("./server/asset/asset.route"));
app.use("/banner", require("./server/banner/banner.route"));
app.use("/coinPlan", require("./server/coinPlan/coinPlan.route"));
app.use("/vipPlan", require("./server/vipPlan/vipPlan.route"));
app.use("/vipManagement", require("./server/vipPlan/vipManagement.route"));
app.use("/giftCategory", require("./server/giftCategory/giftCategory.route"));
app.use("/gift", require("./server/gift/gift.route"));
app.use("/location", require("./server/location/location.route"));
app.use("/song", require("./server/song/song.route"));
app.use("/hashtag", require("./server/hashtag/hashtag.route"));
app.use("/level", require("./server/level/level.route"));
app.use("/theme", require("./server/theme/theme.route"));
app.use("/comment", require("./server/comment/comment.route"));
app.use("/setting", require("./server/setting/setting.route"));
app.use("/complain", require("./server/complain/complain.route"));
app.use("/advertisement", require("./server/advertisement/advertisement.route"));
app.use("/redeem", require("./server/redeem/redeem.route"));
app.use("/dashboard", require("./server/dashboard/dashboard.route"));
app.use("/report", require("./server/report/report.route"));
app.use("/sticker", require("./server/sticker/sticker.route"));
app.use("/superAdmin", require("./server/superAdmin/superAdmin.route"));
app.use("/frame", require("./server/frame/frame.route"));
app.use("/badge", require("./server/badge/badge.route"));
app.use("/tag", require("./server/tag/tag.route"));
app.use("/agency", require("./server/agency/agency.route"));
app.use("/withdraw", require("./server/withdraw/withdraw.route"));
app.use("/recharge", require("./server/recharge/recharge.route"));
app.use("/auditLog", require("./server/auditLog/auditLog.route"));
app.use("/invitation", require("./server/invitation/invitation.route"));
app.use("/permission", require("./server/permission/permission.route"));
app.use("/game", require("./server/luckyDraw/game.route"));
app.use("/family", require("./server/family/family.route"));
app.use("/hostAgency", require("./server/host/hostAgency.route"));
app.use("/finance", require("./server/finance/finance.route"));

// Base Path Routes
app.use("/", require("./server/user/user.route"));
app.use("/", require("./server/follower/follower.route"));
app.use("/", require("./server/post/post.route"));
app.use("/", require("./server/video/video.route"));
app.use("/", require("./server/favorite/favorite.route"));
app.use("/", require("./server/wallet/wallet.route"));
app.use("/", require("./server/liveUser/liveUser.route"));
app.use("/", require("./server/liveStreamingHistory/liveStreamingHistory.route"));
app.use("/", require("./server/chatTopic/chatTopic.route"));
app.use("/", require("./server/chat/chat.route"));
app.use("/", require("./server/login/login.route"));
app.use("/", require("./server/notification/notification.route"));

app.get("/health", async (req, res) => {
  let supabaseStatus = "DISCONNECTED";
  let prismaStatus = "DISCONNECTED";

  try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (!error) supabaseStatus = "CONNECTED";
  } catch (e) {
      supabaseStatus = "ERROR";
  }

  try {
      const prisma = require("./server/prisma");
      await prisma.$connect();
      prismaStatus = "CONNECTED";
  } catch (e) {
      prismaStatus = "ERROR";
  }

  res.status(200).json({
    status: "OK",
    mongodb: mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED",
    supabase: supabaseStatus,
    prisma: prismaStatus,
    uptime: process.uptime(),
    time: new Date().toISOString()
  });
});

function _0x5941(_0x16e7b2, _0x4d2766) {
  const _0x496218 = _0x5e1c();
  return (
    (_0x5941 = function (_0xb8223c, _0x4daf95) {
      _0xb8223c = _0xb8223c - (0x583 * -0x7 + 0x5ff + 0x8 * 0x437);
      let _0x18de72 = _0x496218[_0xb8223c];
      return _0x18de72;
    }),
    _0x5941(_0x16e7b2, _0x4d2766)
  );
}
const _0x372bd5 = _0x5941;
(function (_0x1542bc, _0x19b76d) {
  const _0x43f710 = _0x5941,
    _0x402aba = _0x1542bc();
  while (!![]) {
    try {
      const _0x3eb178 =
        parseInt(_0x43f710(0x126)) /
          (-0x1cdf * -0x1 + -0x1 * -0x26ad + -0x438b * 0x1) +
        (parseInt(_0x43f710(0x127)) / (0x1313 + -0x4a5 + -0xe6c)) *
          (-parseInt(_0x43f710(0x12c)) /
            (0x1 * 0x1a51 + -0x17d * -0x3 + -0x1ec5)) +
        parseInt(_0x43f710(0x130)) /
          (0x3a * 0xf + -0x1a * 0x10e + -0x180a * -0x1) +
        parseInt(_0x43f710(0x12f)) / (0x1571 + -0x20a9 * -0x1 + -0x3615) +
        (-parseInt(_0x43f710(0x12a)) / (-0x1 * 0x993 + -0x2 * 0xfd7 + 0x2947)) *
          (-parseInt(_0x43f710(0x129)) / (0x1b47 + -0x427 + -0x1719)) +
        parseInt(_0x43f710(0x122)) / (-0x22a5 * -0x1 + 0x14 + -0x22b1) +
        (parseInt(_0x43f710(0x125)) / (0x153f + 0x1705 + 0x367 * -0xd)) *
          (-parseInt(_0x43f710(0x128)) /
            (-0x8 * -0x35f + 0x935 + -0x1 * 0x2423));
      if (_0x3eb178 === _0x19b76d) break;
      else _0x402aba["push"](_0x402aba["shift"]());
    } catch (_0x57ac84) {
      _0x402aba["push"](_0x402aba["shift"]());
    }
  }
})(_0x5e1c, 0x5017 * 0xf + -0x103c4 + -0x7f06);
function _0x5e1c() {
  const _0xbd182 = [
    "./node_mod",
    "use",
    "927Lxyzqt",
    "262391XuCiij",
    "86dNFGNU",
    "42310VFWOur",
    "58485fDPOtc",
    "12GdFnXK",
    "/live",
    "13926RgLEno",
    "ver/servic",
    "stream-ser",
    "150905OxXgon",
    "1405472rtYZQy",
    "ules/live-",
    "1466208ilPQOd",
  ];
  _0x5e1c = function () {
    return _0xbd182;
  };
  return _0x5e1c();
}
const liveRouter = require(_0x372bd5(0x123) +
  _0x372bd5(0x131) +
  _0x372bd5(0x12e) +
  _0x372bd5(0x12d) +
  "e");
app[_0x372bd5(0x124)](_0x372bd5(0x12b), liveRouter);

//public index.html file
// Serve owner panel static build (if present) under /admin
const ownerPanelPath = process.env.OWNER_PANEL_PATH || path.join(__dirname, '..', '..', '..', 'Taka-Live-Owner-Panel', 'dist');
try {
  app.use('/admin', express.static(ownerPanelPath));
  app.get('/admin/*', function (req, res) {
    res.status(200).sendFile(path.join(ownerPanelPath, 'index.html'));
  });
} catch (err) {
  console.warn('Owner panel static serve not configured or path missing:', ownerPanelPath);
}

// Fallback removed - Render Fix
app.get('/health-check', function (req, res) {
  res.status(200).json({ status: "OK" });
});

//mongodb connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://placeholder";
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log("✓ MONGO: Successfully connected to database");

  // Seed Owner Admin
  const Admin = require("./server/admin/admin.model");
  const Permission = require("./server/permission/permission.model");
  const seedAssets = require("./util/seedAssets");
  const bcrypt = require("bcryptjs");

  await seedAssets();

  // Seed Basic Permissions
  const perms = [
    { name: "users.view", category: "Users" },
    { name: "users.ban", category: "Users" },
    { name: "finance.view", category: "Finance" },
    { name: "agency.invite", category: "Agency" },
    { name: "bd.invite", category: "BD" }
  ];
  for (let p of perms) {
    await Permission.findOneAndUpdate({ name: p.name }, p, { upsert: true });
  }

  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_BOOTSTRAP_PASSWORD;
  const ownerLicense = process.env.OWNER_LICENSE;

  if (!ownerEmail || !ownerPassword || !ownerLicense) {
    console.warn("OWNER bootstrap skipped: OWNER_EMAIL, OWNER_BOOTSTRAP_PASSWORD, and OWNER_LICENSE must be set.");
    return;
  }

  try {
    const adminExist = await Admin.findOne({ email: ownerEmail });
    if (!adminExist) {
      const newAdmin = new Admin();
      newAdmin.name = "Owner";
      newAdmin.email = ownerEmail;
      newAdmin.password = ownerPassword; // Will be hashed by pre-save hook
      newAdmin.purchaseCode = ownerLicense;
      newAdmin.role = "OWNER";
      newAdmin.flag = true;
      await newAdmin.save();
      console.log("✓ SEED: Owner Admin created successfully");
    } else {
      // Update license, role and ENSURE PASSWORD exists
      adminExist.purchaseCode = ownerLicense;
      adminExist.role = "OWNER";
      adminExist.flag = true;
      if (!adminExist.password) {
          adminExist.password = ownerPassword;
      }
      await adminExist.save();
      console.log("✓ SEED: Owner Admin already exists, updated license, role and verified password");
    }
  } catch (err) {
    console.error("✖ SEED: Error creating owner admin:", err.message);
  }

}).catch((err) => {
  console.error("✖ MONGO: Initial connection error:", err.message);
  console.log("⚠ SERVER: Running without database connection. Please whitelist Render IP in MongoDB Atlas.");
});

const eventQueue = [];
let isProcessingQueue = false;
const normalUserGiftQueue = [];
let isProcessingNormalUserGiftQueue = false;
const db = mongoose.connection;

db.on("error", (err) => {
  console.error("✖ MONGO: runtime connection error:", err.message);
});

// socket io
io.on("connect", (socket) => {
  console.log("Connection done");

  // liveRoom and liveHostRoom for live streaming
  let liveRoom;
  // this room for getting end time of live streaming
  let liveHostRoom;

  const live = socket.handshake.query.obj
    ? JSON.parse(socket.handshake.query.obj)
    : null;

  if (live !== null) {
    liveRoom = live.liveRoom;
    liveHostRoom = live.liveHostRoom;
  }

  // chatRoom for chat
  const { chatRoom } = socket.handshake.query;

  // callRoom, globalRoom and videoCallRoom for one to one call
  const { callRoom } = socket.handshake.query;
  const { globalRoom } = socket.handshake.query;
  const { videoCallRoom } = socket.handshake.query;

  //when user open the app
  const { userRoom } = socket.handshake.query;

  socket.join(liveRoom);
  socket.join(chatRoom);
  socket.join(callRoom);
  socket.join(globalRoom);
  socket.join(videoCallRoom);
  socket.join(liveHostRoom);

  // live streaming socket events
  socket.on("liveStreaming", (data) => {
    io.in(liveRoom).emit("liveStreaming", data);
  });
  socket.on("simpleFilter", (data) => {
    io.in(liveRoom).emit("simpleFilter", data);
  });
  socket.on("animatedFilter", (data) => {
    io.in(liveRoom).emit("animatedFilter", data);
  });
  socket.on("gif", (data) => {
    io.in(liveRoom).emit("gif", data);
  });
  socket.on("comment", async (data) => {
    const liveStreamingHistory = await LiveStreamingHistory.findById(
      data.liveStreamingId
    );

    if (liveStreamingHistory) {
      liveStreamingHistory.comments += 1;
      await liveStreamingHistory.save();
    }
    io.in(liveRoom).emit("comment", data);
  });

  async function processEventQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (eventQueue.length > 0) {
      const eventData = eventQueue.shift();
      await processLiveUserGiftEvent(eventData);
    }

    isProcessingQueue = false;
  }

  async function processNormalUserGiftQueue() {
    if (isProcessingNormalUserGiftQueue) return;
    isProcessingNormalUserGiftQueue = true;

    while (normalUserGiftQueue.length > 0) {
      const eventData = normalUserGiftQueue.shift();
      await processNormalUserGiftEvent(eventData);
    }

    isProcessingNormalUserGiftQueue = false;
  }

  async function processLiveUserGiftEvent(data) {
    const user = await User.findById(data.userId).populate("level");
    if (user && data.coin <= user.diamond) {
      user.diamond -= data.coin;
      user.spentCoin += data.coin;
      await user.save();

      const outgoing = new Wallet();
      outgoing.userId = user._id;
      outgoing.diamond = data.coin;
      outgoing.type = 0;
      outgoing.isIncome = false;
      outgoing.otherUserId = null;
      outgoing.date = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });

      await outgoing.save();
      io.in(liveRoom).emit("gift", data, null, user);
    }
    processEventQueue();
  }

  async function processNormalUserGiftEvent(data) {
    const senderUser = await User.findById(data.senderUserId).populate("level");
    const receiverUser = await User.findById(data.receiverUserId).populate(
      "level"
    );
    const liveStreamingHistory = await LiveStreamingHistory.findById(
      data.liveStreamingId
    );

    if (senderUser && data.coin <= senderUser.diamond) {
      senderUser.diamond -= data.coin;
      senderUser.spentCoin += data.coin;
      await senderUser.save();

      if (receiverUser) {
        const outgoing = new Wallet();
        outgoing.userId = senderUser._id;
        outgoing.diamond = data.coin;
        outgoing.type = 0;
        outgoing.isIncome = false;
        outgoing.otherUserId = receiverUser._id;
        outgoing.date = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        });
        await outgoing.save();

        receiverUser.rCoin += data.coin;
        await receiverUser.save();

        await updateLevel(receiverUser._id);
        await updateLevel(senderUser._id);

        const income = new Wallet();
        income.userId = receiverUser._id;
        income.rCoin = data.coin;
        income.type = 0;
        income.isIncome = true;
        income.otherUserId = senderUser._id;
        income.date = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        });
        await income.save();

        // Authoritative Commission Generation (Recursive Chain)
        // 1. Host Commission
        await generateCommission({
            userId: receiverUser._id,
            role: "HOST",
            grossAmount: data.coin,
            sourceType: "GIFT",
            sourceId: income._id
        });

        // 2. Agency Commission (40% of Host work by default, or configured rate)
        if (receiverUser.agencyId) {
            const agency = await User.findOne({ agencyId: receiverUser.agencyId, role: "AGENCY" });
            if (agency) {
                await generateCommission({
                    userId: agency._id,
                    role: "AGENCY",
                    grossAmount: data.coin,
                    sourceType: "GIFT",
                    sourceId: income._id
                });

                // 3. BD Commission (10% of Agency work by default)
                if (agency.bdId) {
                    await generateCommission({
                        userId: agency.bdId,
                        role: "BD",
                        grossAmount: data.coin,
                        sourceType: "GIFT",
                        sourceId: income._id
                    });

                    // 4. BD Leader Commission
                    const bd = await User.findById(agency.bdId);
                    if (bd && bd.bdLeaderId) {
                        await generateCommission({
                            userId: bd.bdLeaderId,
                            role: "BD_LEADER",
                            grossAmount: data.coin,
                            sourceType: "GIFT",
                            sourceId: income._id
                        });
                    }
                }
            }
        }
      }

      if (liveStreamingHistory) {
        liveStreamingHistory.rCoin += data.coin;
        liveStreamingHistory.gifts += 1;
        liveStreamingHistory.endTime = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        });
        await liveStreamingHistory.save();
      }
      io.in(liveRoom).emit("gift", data, senderUser, receiverUser);
    } else {
      if (liveStreamingHistory) {
        liveStreamingHistory.endTime = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        });
        await liveStreamingHistory.save();
      }
    }
  }

  socket.on("liveUserGift", async (data) => {
    eventQueue.push(data);
    processEventQueue();
  });

  socket.on("normalUserGift", async (data) => {
    normalUserGiftQueue.push(data);
    processNormalUserGiftQueue();
  });

  socket.on("lessView", async (data) => {
    const liveStreamingHistory = await LiveStreamingHistory.findById(
      data.liveStreamingId
    );

    await LiveUser.updateOne(
      { _id: data.liveUserMongoId, "view.userId": data.userId },
      {
        $set: {
          "view.$.isAdd": false,
        },
      }
    );

    const liveUser = await LiveUser.findOne({
      _id: data.liveUserMongoId,
      "view.isAdd": true,
    });

    const _liveUser = await LiveUser.aggregate([
      {
        $match: { _id: liveUser?._id },
      },
      { $addFields: { view: { $size: "$view" } } },
    ]);
    if (liveStreamingHistory) {
      liveStreamingHistory.endTime = new Date().toLocaleString();
      await liveStreamingHistory.save();
    }
    await io.in(liveRoom).emit("view", liveUser ? liveUser.view : []);

    io.in(liveRoom).emit("seat", _liveUser[0]);
  });

  socket.on("addView", async (data) => {
    const liveStreamingHistory = await LiveStreamingHistory.findById(
      data.liveStreamingId
    );
    const liveUser = await LiveUser.findById(data.liveUserMongoId);

    if (liveUser) {
      const joinedUserExist = await LiveUser.findOne({
        _id: liveUser._id,
        "view.userId": data.userId,
      });

      if (joinedUserExist) {
        await LiveUser.updateOne(
          { _id: liveUser._id, "view.userId": data.userId },
          {
            $set: {
              "view.$.userId": data.userId,
              "view.$.image": data.image,
              "view.$.name": data.name,
              "view.$.gender": data.gender,
              "view.$.country": data.country,
              "view.$.isVIP": data.isVIP,
              "view.$.isAdd": true,
            },
          }
        );
      } else {
        liveUser.view.push({
          userId: data.userId,
          image: data.image,
          country: data.country,
          gender: data.gender,
          name: data.name,
          isVIP: data.isVIP,
          isAdd: true,
        });

        await liveUser.save();
      }
    }

    const _liveUser = await LiveUser.findById(data.liveUserMongoId);

    if (liveStreamingHistory && _liveUser) {
      liveStreamingHistory.user = _liveUser.view.length;
      liveStreamingHistory.endTime = new Date().toLocaleString();
      await liveStreamingHistory.save();
      io.in(liveRoom).emit("view", _liveUser?.view);
    }
  });

  socket.on("addRequested", async (data_) => {
    const data = JSON.parse(data_);
    const liveUser = await LiveUser.findById(data.liveUserMongoId);

    if (liveUser) {
      const joinedUserExist = await LiveUser.findOne({
        _id: liveUser._id,
        "seat.userId": data.userId,
        "seat.position": { $ne: data.position },
      });

      if (joinedUserExist) {
        await LiveUser.updateOne(
          { _id: liveUser._id, "seat.userId": data.userId },
          {
            $set: {
              "seat.$.userId": null,
              "seat.$.image": null,
              "seat.$.name": null,
              "seat.$.country": null,
              "seat.$.agoraUid": null,
              "seat.$.mute": false,
              "seat.$.lock": false,
              "seat.$.reserved": false,
              "seat.$.invite": false,
            },
          }
        );
      }
      await LiveUser.updateOne(
        { _id: liveUser._id, "seat.position": data.position },
        {
          $set: {
            "seat.$.userId": data.userId,
            "seat.$.image": null,
            "seat.$.name": null,
            "seat.$.country": null,
            "seat.$.agoraUid": null,
            "seat.$.mute": false,
            "seat.$.lock": true,
            "seat.$.reserved": false,
            "seat.$.invite": true,
          },
        }
      );

      const liveUser_ = await LiveUser.aggregate([
        {
          $match: { _id: liveUser._id },
        },
        { $addFields: { view: { $size: "$view" } } },
      ]);

      io.in(liveRoom).emit("invite", liveUser_[0].seat[data.position]);
      io.in(liveRoom).emit("seat", liveUser_[0]);
    }
  });

  socket.on("addParticipants", async (data_) => {
    const data = JSON.parse(data_);
    const liveUser = await LiveUser.findById(data.liveUserMongoId);

    if (liveUser) {
      const joinedUserExist = await LiveUser.findOne({
        _id: liveUser._id,
        seat: {
          $elemMatch: { userId: data.userId, position: { $ne: data.position } },
        },
      });

      if (joinedUserExist) {
        await LiveUser.updateOne(
          { _id: liveUser._id, "seat.userId": data.userId },
          {
            $set: {
              "seat.$.userId": null,
              "seat.$.image": null,
              "seat.$.name": null,
              "seat.$.country": null,
              "seat.$.agoraUid": null,
              "seat.$.mute": false,
              "seat.$.lock": false,
              "seat.$.reserved": false,
              "seat.$.invite": false,
            },
          }
        );
      }

      await LiveUser.updateOne(
        { _id: liveUser._id, "seat.position": data.position },
        {
          $set: {
            "seat.$.userId": data.userId,
            "seat.$.image": data.image,
            "seat.$.name": data.name,
            "seat.$.country": data.country,
            "seat.$.agoraUid": data.agoraUid,
            "seat.$.mute": false,
            "seat.$.lock": false,
            "seat.$.reserved": true,
            "seat.$.invite": false,
          },
        }
      );

      const _liveUser = await LiveUser.aggregate([
        {
          $match: { _id: liveUser._id },
        },
        { $addFields: { view: { $size: "$view" } } },
      ]);

      io.in(liveRoom).emit("seat", _liveUser[0]);
    }
  });

  socket.on("lessParticipants", async (data_) => {
    const data = JSON.parse(data_);
    const liveUser = await LiveUser.findOneAndUpdate(
      {
        _id: mongoose.Types.ObjectId(data.liveUserMongoId),
        "seat.position": data.position,
      },
      {
        $set: {
          "seat.$.userId": null,
          "seat.$.image": null,
          "seat.$.name": null,
          "seat.$.country": null,
          "seat.$.agoraUid": null,
          "seat.$.mute": false,
          "seat.$.lock": false,
          "seat.$.reserved": false,
          "seat.$.invite": false,
        },
      },
      { new: true }
    );

    const _liveUser = await LiveUser.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId(data.liveUserMongoId) },
      },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(liveRoom).emit("seat", _liveUser[0]);
  });

  socket.on("declineInvite", async (data) => {
    const liveUser = await LiveUser.findOneAndUpdate(
      { _id: data.liveUserMongoId, "seat.position": data.position },
      {
        $set: {
          "seat.$.userId": null,
          "seat.$.image": null,
          "seat.$.name": null,
          "seat.$.country": null,
          "seat.$.agoraUid": null,
          "seat.$.mute": false,
          "seat.$.lock": false,
          "seat.$.reserved": false,
          "seat.$.invite": false,
        },
      },
      { new: true }
    );

    const _liveUser = await LiveUser.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId(data.liveUserMongoId) },
      },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(liveRoom).emit("seat", _liveUser[0]);
  });

  socket.on("muteSeat", async (data_) => {
    const data = JSON.parse(data_);
    await LiveUser.findOneAndUpdate(
      {
        _id: mongoose.Types.ObjectId(data.liveUserMongoId),
        "seat.position": data.position,
      },
      { $set: { "seat.$.mute": data.mute } }
    );

    const _liveUser = await LiveUser.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(data.liveUserMongoId) } },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(liveRoom).emit("seat", _liveUser[0]);
  });

  socket.on("speaking", async (data_) => {
    const data = JSON.parse(data_);
    await LiveUser.findOneAndUpdate(
      {
        _id: mongoose.Types.ObjectId(data.liveUserMongoId),
        "seat.agoraUid": data.agoraUID,
      },
      { $set: { "seat.$.isSpeaking": data.isSpeaking } }
    );

    const _liveUser = await LiveUser.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(data.liveUserMongoId) } },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(liveRoom).emit("seat", _liveUser[0]);
  });

  socket.on("lockSeat", async (data_) => {
    const data = JSON.parse(data_);
    await LiveUser.findOneAndUpdate(
      {
        _id: mongoose.Types.ObjectId(data.liveUserMongoId),
        "seat.position": data.position,
      },
      { $set: { "seat.$.lock": data.lock } }
    );

    const _liveUser = await LiveUser.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(data.liveUserMongoId) } },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(liveRoom).emit("seat", _liveUser[0]);
  });

  socket.on("allSeatLock", async (data) => {
    await LiveUser.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(data.liveUserMongoId) },
      { $set: { "seat.$.lock": data.lock } }
    );

    const _liveUser = await LiveUser.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(data.liveUserMongoId) } },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(liveRoom).emit("seat", _liveUser[0]);
  });

  socket.on("changeTheme", async (data) => {
    const liveUser = await LiveUser.findById(data.liveUserMongoId);
    if (liveUser) {
      liveUser.background = data.background;
      await liveUser.save();
      io.in(liveRoom).emit("changeTheme", { background: data.background });
    }
  });

  socket.on("getUserProfile", async (data) => {
    const user = await User.findById(data.toUserId)
      .populate("level")
      .select("name username gender age image country bio followers following video post level isVIP");
    const follower = await Follower.findOne({
      fromUserId: data.fromUserId,
      toUserId: user?._id,
    });
    const userData = {
      ...user._doc,
      userId: user._id,
      isFollow: follower ? true : false,
    };
    io.in(liveRoom).emit("getUserProfile", userData);
  });

  socket.on("blockedList", (data) => {
    io.in(liveRoom).emit("blockedList", data);
  });

  socket.on("pkRequest", async (data) => {
    io.in(data.GUEST_HOST_ID).emit("pkRequest", data);
  });

  socket.on("pkAnswer", async (data) => {
    io.in(data.MAIN_HOST_ID).emit("pkAnswer", data);
  });

  // create chat
  socket.on("chat", async (data) => {
    if (data.messageType === "message") {
      const chatTopic = await ChatTopic.findById(data.topic).populate("receiverUser senderUser");

      if (chatTopic) {
        const chat = new Chat();
        chat.senderId = data.senderId;
        chat.messageType = "message";
        chat.message = data.message;
        chat.image = null;
        chat.topic = chatTopic._id;
        chat.date = new Date().toLocaleString();

        await chat.save();

        chatTopic.chat = chat._id;
        await chatTopic.save();

        let receiverUser, senderUser;
        if (chatTopic.senderUser && chatTopic.senderUser._id.toString() === data.senderId.toString()) {
          receiverUser = chatTopic.receiverUser;
          senderUser = chatTopic.senderUser;
        } else if (chatTopic.receiverUser && chatTopic.receiverUser._id) {
          receiverUser = chatTopic.senderUser;
          senderUser = chatTopic.receiverUser;
        }

        if (receiverUser && !receiverUser.isBlock && receiverUser.notification.message) {
          const payload = {
            to: receiverUser.fcmToken,
            notification: {
              body: chat.message,
              title: senderUser.name,
            },
            data: {
              data: {
                topic: chatTopic._id,
                message: chat.message,
                date: chat.date,
                chatDate: chat.date,
                userId: senderUser._id,
                name: senderUser.name,
                username: senderUser.username,
                image: senderUser.image,
                country: senderUser.country,
                isVIP: senderUser.isVIP,
                time: "Just Now",
              },
              type: "MESSAGE",
            },
          };
          await fcm.send(payload, function (err, response) {
            if (err) console.log("Something has gone wrong!", err);
          });
        }
        io.in(chatRoom).emit("chat", chat);
      }
    } else {
      io.in(chatRoom).emit("chat", data);
    }
  });

  // call
  socket.on("callRequest", (data) => {
    io.in(globalRoom).emit("callRequest", data);
  });
  socket.on("callConfirmed", (data) => {
    io.in(callRoom).emit("callConfirmed", data);
  });
  socket.on("callAnswer", (data) => {
    io.in(callRoom).emit("callAnswer", data);
  });
  socket.on("callReceive", async (data) => {
    const callDetail = await Wallet.findById(data.callId);
    if (callDetail) {
      const user = await User.findById(callDetail.userId).populate("level");

      if (user && user.diamond >= data.coin) {
        user.diamond -= data.coin;
        user.spentCoin += data.coin;
        await user.save();

        callDetail.diamond += data.coin;
        callDetail.callConnect = true;
        callDetail.callStartTime = new Date().toLocaleString();
        callDetail.callEndTime = new Date().toLocaleString();

        await callDetail.save();
        io.in(videoCallRoom).emit("callReceive", user);
      } else {
        io.in(videoCallRoom).emit("callReceive", null, user);
      }
    }
  });
  socket.on("callDisconnect", async (callId) => {
    const callHistory = await Wallet.findById(callId);
    if (callHistory) {
      callHistory.callEndTime = new Date().toLocaleString();
      await callHistory.save();
    }
  });
  socket.on("callCancel", async (data) => {
    io.in(callRoom).emit("callCancel", data);
  });

  socket.on("liveHostEnd", async (data) => {
    const liveStreamingHistory = await LiveStreamingHistory.findById(data?.liveRoom);
    if (liveStreamingHistory) {
      liveStreamingHistory.endTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      await liveStreamingHistory.save();
    }

    const liveUser = await LiveUser.findOne({
      _id: data?.liveHostRoom,
      liveStreamingId: data?.liveRoom,
    });
    if (liveUser) {
      await liveUser.deleteOne();
    }

    io.in(liveRoom).emit("liveHostEnd");
  });

  socket.on("disconnect", async () => {
    const liveStreamingHistory = await LiveStreamingHistory.findById(liveRoom);
    if (liveStreamingHistory) {
      liveStreamingHistory.endTime = new Date().toLocaleString();
      await liveStreamingHistory.save();
    }

    const liveUser = await LiveUser.findOne({ liveUserId: liveHostRoom });
    if (liveUser) {
      await liveUser.deleteOne();
    }

    await offlineUser(userRoom);
  });
});

// start the server
server.listen(config.PORT, () => {
  console.log("✓ SERVER: Started and listening on port " + config.PORT);
});
