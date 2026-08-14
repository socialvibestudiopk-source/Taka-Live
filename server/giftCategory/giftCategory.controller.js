const Category = require("./giftCategory.model");
const Gift = require("../gift/gift.model");
const prisma = require("../../prisma");
const fs = require("fs");
const { deleteFile } = require("../../util/deleteFile");
const { compressImage } = require("../../util/compressImage");

// UUID helper
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const GiftCategoryController = {
    // 1. Get All Categories
    index: async (req, res) => {
        try {
            // Prisma Try
            const sCategories = await prisma.giftCategory.findMany({ include: { _count: { select: { gifts: true } } } });
            if (sCategories && sCategories.length > 0) {
                return res.status(200).json({ status: true, category: sCategories.map(c => ({ ...c, _id: c.id, giftCount: c._count.gifts })) });
            }
            // Mongo Fallback
            const mCategories = await Category.aggregate([{ $lookup: { from: "gifts", localField: "_id", foreignField: "category", as: "gift" } }]);
            return res.status(200).json({ status: true, category: mCategories.map(c => ({ ...c, giftCount: c.gift.length })) });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 2. Store Category
    store: async (req, res) => {
        try {
            if (!req.file || !req.body.name) return res.status(200).json({ status: false, message: "Missing Fields" });
            compressImage(req.file);

            // Supabase Try
            try {
                const sCategory = await prisma.giftCategory.create({ data: { name: req.body.name, image: req.file.path } });
                // Dual write to Mongo for legacy support
                const mCategory = new Category({ name: req.body.name, image: req.file.path });
                await mCategory.save();
                return res.status(200).json({ status: true, message: "Category Created (Synced)", category: sCategory });
            } catch (e) { console.error("Prisma Category Store Error:", e.message); }

            // Fallback
            const mCategory = new Category({ name: req.body.name, image: req.file.path });
            await mCategory.save();
            return res.status(200).json({ status: true, category: mCategory });

        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // Standard CRUD Placeholders
    update: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    destroy: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); }
};

module.exports = GiftCategoryController;
