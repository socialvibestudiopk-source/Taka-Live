const Post = require("./post.model");
const User = require("../user/user.model");
const prisma = require("../../prisma");
const dayjs = require("dayjs");
const fs = require("fs");
const { deleteFile } = require("../../util/deleteFile");
const { compressImage } = require("../../util/compressImage");

// Helper to handle BigInt and Android compatibility
const mapPost = (post) => {
    if (!post) return null;
    return {
        ...post,
        _id: post.id,
        userId: post.user_id,
        isFake: post.is_fake,
        allowComment: post.allow_comment,
        like: post.like_count,
        comment: post.comment_count
    };
};

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
            const mapped = posts.map(p => ({
                ...mapPost(p),
                userId: {
                    ...p.user,
                    _id: p.user.id,
                    username: p.user.username,
                    name: p.user.name,
                    image: p.user.image
                }
            }));
            return res.status(200).json({ status: true, message: "Success (Prisma)!!", total, post: serialize(mapped) });
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
    const { userId, caption, allowComment } = req.body;
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

        return res.status(200).json({ status: true, message: "Success (Prisma)!!", post: serialize(mapPost(post)) });
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

// get popular and latest post list
exports.getPopularLatestPosts = async (req, res) => {
    try {
        const posts = await Post.find({ isDelete: false }).populate("userId").sort({ createdAt: -1 }).limit(20);
        return res.status(200).json({ status: true, message: "Success!!", post: posts });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// get following post list
exports.getFollowingPosts = async (req, res) => {
    try {
        const posts = await Post.find({ isDelete: false }).populate("userId").sort({ createdAt: -1 }).limit(20);
        return res.status(200).json({ status: true, message: "Success!!", post: posts });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// get users post list
exports.getUserPosts = async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.query.userId, isDelete: false }).populate("userId").sort({ createdAt: -1 });
        return res.status(200).json({ status: true, message: "Success!!", post: posts });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// allow disallow comment
exports.allowDisallowComment = async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(200).json({ status: false, message: "Post not found" });
        post.allowComment = !post.allowComment;
        await post.save();
        return res.status(200).json({ status: true, message: "Success!!", post });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// destroy post
exports.destroy = async (req, res) => {
    try {
        const post = await Post.findById(req.query.postId);
        if (!post) return res.status(200).json({ status: false, message: "Post not found" });
        if (fs.existsSync(post.post)) fs.unlinkSync(post.post);
        await post.deleteOne();
        return res.status(200).json({ status: true, message: "Success!!" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// get post by id
exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.query.postId).populate("userId");
        return res.status(200).json({ status: true, message: "Success!!", post });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
