const Category = require("./giftCategory.model");
const Gift = require("../gift/gift.model");
const prisma = require("../../prisma");
const { deleteFile } = require("../../util/deleteFile");
const fs = require("fs");
const { compressImage } = require("../../util/compressImage");

// Helper to handle BigInt serialization in JSON
const serialize = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

//get all category
exports.index = async (req, res) => {
  try {
    // --- PRISMA (SUPABASE) ---
    try {
        const categories = await prisma.giftCategory.findMany({
            include: { _count: { select: { gifts: true } } },
            orderBy: { created_at: 'desc' }
        });

        if (categories && categories.length > 0) {
            const formatted = categories.map(c => ({
                ...c,
                giftCount: c._count.gifts
            }));
            return res.status(200).json({ status: true, message: "Success (Prisma)!!", category: formatted });
        }
    } catch (e) { console.warn("Prisma Category Error:", e.message); }

    // --- MONGO FALLBACK ---
    const category = await Category.aggregate([
      {
        $lookup: {
          from: "gifts",
          localField: "_id",
          foreignField: "category",
          as: "gift"
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          name: 1,
          image: 1,
          createdAt: 1,
          giftCount: { $size: "$gift" }
        }
      }
    ]);

    return res.status(200).json({ status: true, message: "Success (Legacy)!!", category });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// create category
exports.store = async (req, res) => {
  try {
    if (!req.file || !req.body.name)
      return res.status(200).json({ status: false, message: "Invalid Details!" });

    compressImage(req.file);

    // 1. Create in Supabase
    try {
        const sCategory = await prisma.giftCategory.create({
            data: {
                name: req.body.name,
                image: req.file.path
            }
        });
        // Also save to Mongo for sync
        const category = new Category({ name: req.body.name, image: req.file.path });
        await category.save();

        return res.status(200).json({ status: true, message: "Success (Synced)!", category: serialize(sCategory) });
    } catch (e) { console.warn("Prisma Store Error:", e.message); }

    // Fallback
    const category = new Category({ name: req.body.name, image: req.file.path });
    await category.save();

    return res.status(200).json({ status: true, message: "Success!", category });
  } catch (error) {
    if (req.file) deleteFile(req.file);
    return res.status(500).json({ status: false, error: error.message });
  }
};

// update category
exports.update = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Try Prisma Update
    try {
        const sCategory = await prisma.giftCategory.findUnique({ where: { id: categoryId } });
        if (sCategory) {
            let updateData = { name: req.body.name || sCategory.name };
            if (req.file) {
                if (fs.existsSync(sCategory.image)) fs.unlinkSync(sCategory.image);
                compressImage(req.file);
                updateData.image = req.file.path;
            }
            const updated = await prisma.giftCategory.update({
                where: { id: categoryId },
                data: updateData
            });
            return res.status(200).json({ status: true, message: "Success (Prisma)!", category: serialize(updated) });
        }
    } catch (e) {}

    // Fallback
    const category = await Category.findById(categoryId);
    if (!category) {
        if (req.file) deleteFile(req.file);
        return res.status(200).json({ status: false, message: "Category does not Exist!" });
    }

    if (req.file) {
        if (fs.existsSync(category.image)) fs.unlinkSync(category.image);
        compressImage(req.file);
        category.image = req.file.path;
    }
    category.name = req.body.name || category.name;
    await category.save();

    return res.status(200).json({ status: true, message: "Success!", category });
  } catch (error) {
    if (req.file) deleteFile(req.file);
    return res.status(500).json({ status: false, error: error.message });
  }
};

// delete category
exports.destroy = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Try Prisma
    try {
        const sCategory = await prisma.giftCategory.findUnique({ where: { id: categoryId } });
        if (sCategory) {
            if (fs.existsSync(sCategory.image)) fs.unlinkSync(sCategory.image);
            await prisma.giftCategory.delete({ where: { id: categoryId } });
            return res.status(200).json({ status: true, message: "Success (Prisma)!" });
        }
    } catch (e) {}

    const category = await Category.findById(categoryId);
    if (!category) return res.status(200).json({ status: false, message: "Category does not Exist!" });

    if (fs.existsSync(category.image)) fs.unlinkSync(category.image);
    await category.deleteOne();

    return res.status(200).json({ status: true, message: "Success!" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
