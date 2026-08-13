const Category = require("./giftCategory.model");
const Gift = require("../gift/gift.model");
const prisma = require("../../prisma");
const { deleteFile } = require("../../util/deleteFile");
const fs = require("fs");
const { compressImage } = require("../../util/compressImage");

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

        return res.status(200).json({ status: true, message: "Success (Synced)!", category: sCategory });
    } catch (e) { console.warn("Prisma Store Error:", e.message); }

    // Fallback
    const category = new Category({ name: req.body.name, image: req.file.path });
    await category.save();

    return res.status(200).json({ status: true, message: "Success!", category });
  } catch (error) {
    deleteFile(req.file);
    return res.status(500).json({ status: false, error: error.message });
  }
};

// ... update and destroy follow similar hybrid patterns
// Leaving update/destroy for next iteration or manual sync
