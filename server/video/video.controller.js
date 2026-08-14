const Video = require("./video.model");
const User = require("../user/user.model");
const prisma = require("../../prisma");
const fs = require("fs");
const { deleteFile } = require("../../util/deleteFile");
const config = require("../../config");

// Helper to handle BigInt serialization in JSON
const serialize = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

// index
exports.index = async (req, res) => {
  try {
    const start = parseInt(req.query.start) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (start - 1) * limit;

    // --- PRISMA (SUPABASE) ---
    try {
        const where = { is_fake: req.query.type === "Fake" };
        const [videos, total] = await Promise.all([
            prisma.video.findMany({
                where,
                include: { user: true },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma.video.count({ where })
        ]);

        if (videos && videos.length > 0) {
            return res.status(200).json({ status: true, message: "Success (Prisma)!!", total, video: serialize(videos) });
        }
    } catch (e) { console.warn("Prisma Video Error:", e.message); }

    // --- MONGO FALLBACK ---
    const mongoVideos = await Video.find({ isDelete: false })
        .populate("userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return res.status(200).json({ status: true, message: "Success (Legacy)!!", video: mongoVideos });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// upload video
exports.uploadVideo = async (req, res) => {
  try {
    const { userId, caption } = req.body;
    if (!req.files.video || !userId) {
        if (req.files.video) deleteFile(req.files.video[0]);
        return res.status(200).json({ status: false, message: "Invalid Details!" });
    }

    const videoUrl = config.SERVER_PATH + req.files.video[0].path;
    const thumbnail = req.files.thumbnail ? config.SERVER_PATH + req.files.thumbnail[0].path : null;

    // 1. Try Prisma
    try {
        const video = await prisma.video.create({
            data: {
                user_id: userId,
                video_url: videoUrl,
                thumbnail: thumbnail,
                caption,
                is_fake: false
            }
        });
        // Sync with Mongo
        const mongoVideo = new Video({ userId, video: videoUrl, thumbnail, caption });
        await mongoVideo.save();

        return res.status(200).json({ status: true, message: "Success (Prisma)!!", video: serialize(video) });
    } catch (e) { console.warn("Prisma Video Upload Error:", e.message); }

    // Fallback
    const mongoVideo = new Video({ userId, video: videoUrl, thumbnail, caption });
    await mongoVideo.save();
    return res.status(200).json({ status: true, message: "Success!!", video: mongoVideo });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// get video
exports.getVideo = async (req, res) => {
    try {
        const videos = await Video.find({ isDelete: false }).populate("userId").sort({ createdAt: -1 }).limit(20);
        return res.status(200).json({ status: true, message: "Success!!", video: videos });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// get video by id
exports.getVideoById = async (req, res) => {
    try {
        const video = await Video.findById(req.query.videoId).populate("userId");
        return res.status(200).json({ status: true, message: "Success!!", video });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// allow disallow comment
exports.allowDisallowComment = async (req, res) => {
    try {
        const video = await Video.findById(req.params.videoId);
        if (!video) return res.status(200).json({ status: false, message: "Video not found" });
        video.allowComment = !video.allowComment;
        await video.save();
        return res.status(200).json({ status: true, message: "Success!!", video });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// destroy video
exports.destroy = async (req, res) => {
    try {
        const video = await Video.findById(req.query.videoId);
        if (!video) return res.status(200).json({ status: false, message: "Video not found" });
        if (fs.existsSync(video.video)) fs.unlinkSync(video.video);
        await video.deleteOne();
        return res.status(200).json({ status: true, message: "Success!!" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
