const Asset = require("./asset.model");
const User = require("../user/user.model");
const fs = require("fs");
const path = require("path");

exports.index = async (req, res) => {
  try {
    const { type, category } = req.query;
    let query = { isActive: true };
    if (type) query.type = type;
    if (category) query.category = category;

    const assets = await Asset.find(query).sort({ displayOrder: 1, createdAt: -1 });
    return res.status(200).json({ status: true, message: "Success", assets });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.store = async (req, res) => {
  try {
    if (!req.file) return res.status(200).json({ status: false, message: "Asset image is required" });

    const asset = new Asset(req.body);
    asset.image = req.file.path;
    await asset.save();

    return res.status(200).json({ status: true, message: "Asset created successfully", asset });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.update = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(200).json({ status: false, message: "Asset not found" });

        if (req.file) {
            if (fs.existsSync(asset.image)) fs.unlinkSync(asset.image);
            asset.image = req.file.path;
        }

        Object.assign(asset, req.body);
        await asset.save();

        return res.status(200).json({ status: true, message: "Asset updated successfully", asset });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.destroy = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(200).json({ status: false, message: "Asset not found" });

        if (fs.existsSync(asset.image)) fs.unlinkSync(asset.image);
        await asset.deleteOne();

        return res.status(200).json({ status: true, message: "Asset deleted successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.assignToUser = async (req, res) => {
    try {
        const { userId, assetId } = req.body;
        const user = await User.findById(userId);
        const asset = await Asset.findById(assetId);

        if (!user || !asset) return res.status(200).json({ status: false, message: "User or Asset not found" });

        if (!user.inventory) {
            user.inventory = { frames: [], badges: [], bubbles: [], entranceEffects: [], vehicles: [] };
        }

        // Map asset type to inventory key
        const typeMap = {
            "FRAME": "frames",
            "BADGE": "badges",
            "BUBBLE": "bubbles",
            "VEHICLE": "vehicles",
            "TAG": "tags",
            "NAMEPLATE": "nameplates"
        };

        const key = typeMap[asset.type];
        if (key && !user.inventory[key]) user.inventory[key] = [];

        if (key) {
            if (user.inventory[key].includes(asset._id)) {
                return res.status(200).json({ status: false, message: "User already has this asset" });
            }
            user.inventory[key].push(asset._id);
        }

        await user.save();
        return res.status(200).json({ status: true, message: "Asset assigned successfully" });

    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
