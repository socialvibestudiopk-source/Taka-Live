const Gift = require("./gift.model");
const Category = require("../giftCategory/giftCategory.model");
const prisma = require("../../prisma");
const fs = require("fs");
const { deleteFiles, deleteFile } = require("../../util/deleteFile");

// Helper to handle BigInt serialization in JSON
const serialize = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

// get all gift
exports.index = async (req, res) => {
  try {
    // --- PRISMA (SUPABASE) ---
    try {
        const categories = await prisma.giftCategory.findMany({
            include: { gifts: true },
            orderBy: { created_at: 'desc' }
        });

        if (categories && categories.length > 0) {
            const formatted = categories.map(c => ({
                _id: c.id,
                name: c.name,
                image: c.image,
                gift: c.gifts.map(g => ({ ...g, _id: g.id }))
            }));
            return res.status(200).json({ status: true, message: "Success (Prisma)!!", gift: serialize(formatted) });
        }
    } catch (e) { console.warn("Prisma Gift Index Error:", e.message); }

    // --- MONGO FALLBACK ---
    const gift = await Category.aggregate([
      {
        $lookup: {
          from: "gifts",
          localField: "_id",
          foreignField: "category",
          as: "gift",
        },
      },
    ]);

    return res.status(200).json({ status: true, message: "Success (Legacy)!!", gift });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// get category wise gifts
exports.categoryWiseGift = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    // Try Prisma
    try {
        const gifts = await prisma.gift.findMany({
            where: { category_id: categoryId },
            orderBy: { created_at: 'desc' }
        });
        if (gifts && gifts.length > 0) {
            return res.status(200).json({ status: true, message: "Success (Prisma)!!", gift: serialize(gifts) });
        }
    } catch (e) {}

    const gift = await Gift.find({ category: categoryId }).sort({ createdAt: -1 });
    return res.status(200).json({ status: true, message: "Success!!", gift });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

//store Multiple gift (Hybrid)
exports.store = async (req, res) => {
  try {
    const { coin, category, name, isLucky } = req.body;
    if (!coin || !req.files || !category) {
        if (req.files) deleteFiles(req.files);
        return res.status(200).json({ status: false, message: "Invalid Details!" });
    }

    const giftData = req.files.map((file) => {
        let type = 0;
        if (file.mimetype === "image/gif") type = 1;
        if (file.originalname.endsWith('.svga')) type = 2;
        return {
            name: name || file.originalname.split('.')[0],
            image: file.path,
            coin: Number(coin),
            category_id: category,
            type: type,
            is_lucky: isLucky === 'true'
        };
    });

    // 1. Try Supabase
    try {
        await prisma.gift.createMany({ data: giftData });
        // Also save to Mongo for sync
        const mongoGifts = giftData.map(g => ({ ...g, category: g.category_id, isLucky: g.is_lucky }));
        await Gift.insertMany(mongoGifts);
        return res.status(200).json({ status: true, message: "Success (Synced)!" });
    } catch (e) { console.warn("Prisma Store Error:", e.message); }

    // Fallback
    const gifts = await Gift.insertMany(giftData.map(g => ({ ...g, category: g.category_id, isLucky: g.is_lucky })));
    return res.status(200).json({ status: true, message: "Success!", gift: gifts });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
