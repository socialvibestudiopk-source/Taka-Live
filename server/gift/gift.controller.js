const Gift = require("./gift.model");
const Category = require("../giftCategory/giftCategory.model");
const prisma = require("../../prisma");
const fs = require("fs");
const { deleteFiles, deleteFile } = require("../../util/deleteFile");

// UUID helper
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const GiftController = {
    // 1. Get All Gifts (Categorized)
    index: async (req, res) => {
        try {
            // Prisma Try
            const sCategories = await prisma.giftCategory.findMany({ include: { gifts: true } });
            if (sCategories && sCategories.length > 0) {
                const formatted = sCategories.map(c => ({
                    _id: c.id,
                    name: c.name,
                    image: c.image,
                    gift: c.gifts.map(g => ({ ...g, _id: g.id }))
                }));
                return res.status(200).json({ status: true, message: "Success", gift: formatted });
            }
            // Mongo Fallback
            const mGifts = await Category.aggregate([{ $lookup: { from: "gifts", localField: "_id", foreignField: "category", as: "gift" } }]);
            return res.status(200).json({ status: true, gift: mGifts });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 2. Store Multiple Gifts
    store: async (req, res) => {
        try {
            const { coin, category, name } = req.body;
            if (!coin || !req.files || !category) {
                if (req.files) deleteFiles(req.files);
                return res.status(200).json({ status: false, message: "Missing Fields" });
            }

            const giftData = req.files.map(file => ({
                name: name || file.originalname.split('.')[0],
                image: file.path,
                coin: Number(coin),
                category_id: isUUID(category) ? category : null,
                is_lucky: false
            }));

            // Supabase Try (If category is UUID)
            if (isUUID(category)) {
                try {
                    await prisma.gift.createMany({ data: giftData });
                    return res.status(200).json({ status: true, message: "Gifts Uploaded to Supabase" });
                } catch (e) { console.error("Prisma Gift Store Error:", e.message); }
            }

            // Mongo Fallback
            const mongoGifts = giftData.map(g => ({ ...g, category: category }));
            const saved = await Gift.insertMany(mongoGifts);
            return res.status(200).json({ status: true, message: "Gifts Uploaded to MongoDB", gift: saved });

        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 3. Category wise gift
    categoryWiseGift: async (req, res) => {
        try {
            const { categoryId } = req.params;
            if (isUUID(categoryId)) {
                const gifts = await prisma.gift.findMany({ where: { category_id: categoryId } });
                return res.status(200).json({ status: true, gift: gifts.map(g => ({ ...g, _id: g.id })) });
            }
            const mGifts = await Gift.find({ category: categoryId });
            return res.status(200).json({ status: true, gift: mGifts });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // Standard CRUD Placeholders
    update: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    destroy: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); }
};

module.exports = GiftController;
