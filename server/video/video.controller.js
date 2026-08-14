const Video = require("./video.model");
const User = require("../user/user.model");
const prisma = require("../../prisma");
const config = require("../../config");

const mapVideo = (video) => {
    if (!video) return null;
    return {
        ...video,
        _id: video.id,
        userId: video.user_id,
        video: video.video_url,
        like: video.like_count,
        comment: video.comment_count
    };
};

const VideoController = {
    // 1. Get All Videos
    index: async (req, res) => {
        try {
            const videos = await prisma.video.findMany({ include: { user: true }, take: 10 });
            return res.status(200).json({ status: true, video: videos.map(v => ({
                ...mapVideo(v),
                userId: { ...v.user, _id: v.user.id }
            })) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 2. Upload Video
    uploadVideo: async (req, res) => {
        try {
            const { userId } = req.body;
            const video = await prisma.video.create({ data: { user_id: userId, video_url: req.files.video[0].path } });
            return res.status(200).json({ status: true, video: mapVideo(video) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 3. Dummy functions
    getVideo: async (req, res) => { return res.status(200).json({ status: true, video: [] }); },
    getVideoById: async (req, res) => { return res.status(200).json({ status: true, video: {} }); },
    allowDisallowComment: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    destroy: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); }
};

module.exports = VideoController;
