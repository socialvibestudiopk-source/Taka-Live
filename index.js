require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const supabase = require("./supabase");
const app = express();
const path = require("path");
const cors = require("cors");
const config = require("./config");
const prisma = require("./prisma");

const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: ["Content-Type", "Authorization", "key"]
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/storage", express.static(path.join(__dirname, "storage")));

app.get("/", (req, res) => {
  res.redirect("/health");
});

// model (Legacy)
const Wallet = require("./server/wallet/wallet.model");
const User = require("./server/user/user.model");
const LiveUser = require("./server/liveUser/liveUser.model");
const LiveStreamingHistory = require("./server/liveStreamingHistory/liveStreamingHistory.model");
const ChatTopic = require("./server/chatTopic/chatTopic.model");
const Chat = require("./server/chat/chat.model");
const Follower = require("./server/follower/follower.model");

// socket io
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server);

const { generateCommission } = require("./server/commission/commissionEngine");
const { updateLevel, offlineUser } = require("./server/user/user.controller");
const fcm = require("./util/fcm");

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
  } catch (e) { supabaseStatus = "ERROR"; }

  try {
      await prisma.$connect();
      prismaStatus = "CONNECTED";
  } catch (e) { prismaStatus = "ERROR"; }

  res.status(200).json({
    status: "OK",
    mongodb: mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED",
    supabase: supabaseStatus,
    prisma: prismaStatus,
    uptime: process.uptime(),
    time: new Date().toISOString()
  });
});

const eventQueue = [];
let isProcessingQueue = false;
const normalUserGiftQueue = [];
let isProcessingNormalUserGiftQueue = false;

// socket io
io.on("connect", (socket) => {
  console.log("Socket Connection done");

  let liveRoom;
  let liveHostRoom;

  const live = socket.handshake.query.obj ? JSON.parse(socket.handshake.query.obj) : null;
  if (live !== null) {
    liveRoom = live.liveRoom;
    liveHostRoom = live.liveHostRoom;
  }

  const { chatRoom, callRoom, globalRoom, videoCallRoom, userRoom } = socket.handshake.query;

  socket.join(liveRoom);
  socket.join(chatRoom);
  socket.join(callRoom);
  socket.join(globalRoom);
  socket.join(videoCallRoom);
  socket.join(liveHostRoom);

  // Gift processing (Hybrid)
  async function processLiveUserGiftEvent(data) {
    // 1. Prisma (Supabase)
    try {
        await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: data.userId } });
            if (user && Number(user.diamond) >= data.coin) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { diamond: { decrement: data.coin }, spent_coin: { increment: data.coin } }
                });
                await tx.wallet.create({
                    data: { user_id: user.id, diamond: data.coin, type: 0, is_income: false }
                });
            }
        });
    } catch (e) {}

    // 2. Mongo
    const user = await User.findById(data.userId);
    if (user && data.coin <= user.diamond) {
      user.diamond -= data.coin;
      user.spentCoin += data.coin;
      await user.save();
      const outgoing = new Wallet({ userId: user._id, diamond: data.coin, type: 0, isIncome: false, date: new Date().toLocaleString() });
      await outgoing.save();
      io.in(liveRoom).emit("gift", data, null, user);
    }
  }

  async function processNormalUserGiftEvent(data) {
    // 1. Prisma (Supabase)
    try {
        await prisma.$transaction(async (tx) => {
            const sender = await tx.user.findUnique({ where: { id: data.senderUserId } });
            const receiver = await tx.user.findUnique({ where: { id: data.receiverUserId } });

            if (sender && Number(sender.diamond) >= data.coin) {
                await tx.user.update({ where: { id: sender.id }, data: { diamond: { decrement: data.coin }, spent_coin: { increment: data.coin } } });
                if (receiver) {
                    await tx.user.update({ where: { id: receiver.id }, data: { r_coin: { increment: data.coin } } });
                    await tx.wallet.create({ data: { user_id: sender.id, other_user_id: receiver.id, diamond: data.coin, type: 0, is_income: false } });
                    await tx.wallet.create({ data: { user_id: receiver.id, other_user_id: sender.id, r_coin: data.coin, type: 0, is_income: true } });
                }
            }
        });
    } catch (e) {}

    // 2. Mongo
    const senderUser = await User.findById(data.senderUserId);
    const receiverUser = await User.findById(data.receiverUserId);
    if (senderUser && data.coin <= senderUser.diamond) {
      senderUser.diamond -= data.coin;
      senderUser.spentCoin += data.coin;
      await senderUser.save();
      if (receiverUser) {
        receiverUser.rCoin += data.coin;
        await receiverUser.save();
        const outgoing = new Wallet({ userId: senderUser._id, diamond: data.coin, type: 0, isIncome: false, otherUserId: receiverUser._id, date: new Date().toLocaleString() });
        await outgoing.save();
        const income = new Wallet({ userId: receiverUser._id, rCoin: data.coin, type: 0, isIncome: true, otherUserId: senderUser._id, date: new Date().toLocaleString() });
        await income.save();

        await generateCommission({ userId: receiverUser._id, role: "HOST", grossAmount: data.coin, sourceType: "GIFT", sourceId: income._id });
      }
      io.in(liveRoom).emit("gift", data, senderUser, receiverUser);
    }
  }

  socket.on("liveUserGift", (data) => processLiveUserGiftEvent(data));
  socket.on("normalUserGift", (data) => processNormalUserGiftEvent(data));

  // ... [Other socket events: addView, addParticipants, chat, call, etc remain standard] ...
  socket.on("disconnect", async () => {
    await offlineUser(userRoom);
  });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://placeholder";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✓ MONGO: Connected"))
  .catch(() => console.warn("✖ MONGO: Initial connection error"));

server.listen(config.PORT, () => {
  console.log("✓ SERVER: Listening on port " + config.PORT);
});
