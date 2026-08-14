const Post = require("./post.model");
const User = require("../user/user.model");
const prisma = require("../../prisma");
const dayjs = require("dayjs");
const fs = require("fs");
const { deleteFile } = require("../../util/deleteFile");
const { compressImage } = require("../../util/compressImage");

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
        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                where,
                include: { user: true },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma.post.count({ where })
        ]);

        if (posts && posts.length > 0) {
            return res.status(200).json({ status: true, message: "Success (Prisma)!!", total, post: serialize(posts) });
        }
    } catch (e) { console.warn("Prisma Post Error:", e.message); }

    // --- MONGO FALLBACK ---
    const mongoPosts = await Post.find({ isDelete: false })
        .populate("userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return res.status(200).json({ status: true, message: "Success (Legacy)!!", post: mongoPosts });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// upload post
exports.uploadPost = async (req, res) => {
  try {
    const { userId, caption, location, allowComment } = req.body;
    if (!req.file || !userId) return res.status(200).json({ status: false, message: "Invalid Details!" });

    compressImage(req.file);

    // 1. Try Prisma
    try {
        const post = await prisma.post.create({
            data: {
                user_id: userId,
                image: req.file.path,
                caption,
                allow_comment: allowComment === 'true'
            }
        });
        // Sync with Mongo
        const mongoPost = new Post({ userId, post: req.file.path, caption, allowComment: allowComment === 'true' });
        await mongoPost.save();

        return res.status(200).json({ status: true, message: "Success (Prisma)!!", post: serialize(post) });
    } catch (e) { console.warn("Prisma Upload Error:", e.message); }

    // Fallback
    const mongoPost = new Post({ userId, post: req.file.path, caption, allowComment: allowComment === 'true' });
    await mongoPost.save();
    return res.status(200).json({ status: true, message: "Success!!", post: mongoPost });
  } catch (error) {
    if (req.file) deleteFile(req.file);
    return res.status(500).json({ status: false, error: error.message });
  }
};

// More methods (Popular, Following, UserPosts) would follow the same hybrid pattern...
