const Post = require("./post.model");
const User = require("../user/user.model");
const prisma = require("../../prisma");
const fs = require("fs");
const { compressImage } = require("../../util/compressImage");

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

const PostController = {
    // 1. Get All Posts
    index: async (req, res) => {
        try {
            const posts = await prisma.post.findMany({ include: { user: true }, take: 10, orderBy: { created_at: 'desc' } });
            return res.status(200).json({ status: true, post: posts.map(p => ({
                ...mapPost(p),
                userId: { ...p.user, _id: p.user.id }
            })) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 2. Upload Post
    uploadPost: async (req, res) => {
        try {
            const { userId, caption } = req.body;
            const post = await prisma.post.create({ data: { user_id: userId, image: req.file.path, caption } });
            return res.status(200).json({ status: true, post: mapPost(post) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 3. Dummy functions for routes to prevent crash
    getPopularLatestPosts: async (req, res) => { return res.status(200).json({ status: true, post: [] }); },
    getFollowingPosts: async (req, res) => { return res.status(200).json({ status: true, post: [] }); },
    getUserPosts: async (req, res) => { return res.status(200).json({ status: true, post: [] }); },
    allowDisallowComment: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    destroy: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    getPostById: async (req, res) => { return res.status(200).json({ status: true, post: {} }); }
};

module.exports = PostController;
