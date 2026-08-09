const Frame = require("./frame.model");
const fs = require("fs");
const { compressImage } = require("../../util/compressImage");

exports.index = async (req, res) => {
  try {
    const frames = await Frame.find().sort({ createdAt: -1 });
    return res.status(200).json({ status: true, message: "Success", frames });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.store = async (req, res) => {
  try {
    if (!req.body.name || !req.file) {
      return res.status(200).json({ status: false, message: "Invalid Details!" });
    }

    const frame = new Frame();
    frame.name = req.body.name;
    frame.image = req.file.path;
    frame.coin_price = req.body.coin_price || 0;
    frame.type = req.body.type || "PREMIUM";
    frame.rarity = req.body.rarity || "common";
    frame.is_animated = req.body.is_animated === "true" || req.body.is_animated === true;

    await frame.save();

    return res.status(200).json({ status: true, message: "Frame Created Successfully", frame });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const frame = await Frame.findById(req.params.id);
    if (!frame) return res.status(200).json({ status: false, message: "Frame not found" });

    if (req.file) {
      if (fs.existsSync(frame.image)) {
        fs.unlinkSync(frame.image);
      }
      frame.image = req.file.path;
    }

    frame.name = req.body.name || frame.name;
    frame.coin_price = req.body.coin_price || frame.coin_price;
    frame.type = req.body.type || frame.type;
    frame.rarity = req.body.rarity || frame.rarity;
    frame.is_animated = req.body.is_animated !== undefined ? (req.body.is_animated === "true" || req.body.is_animated === true) : frame.is_animated;

    await frame.save();

    return res.status(200).json({ status: true, message: "Frame Updated Successfully", frame });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const frame = await Frame.findById(req.params.id);
    if (!frame) return res.status(200).json({ status: false, message: "Frame not found" });

    frame.is_active = !frame.is_active;
    await frame.save();

    return res.status(200).json({ status: true, message: "Success", is_active: frame.is_active });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.destroy = async (req, res) => {
  try {
    const frame = await Frame.findById(req.params.id);
    if (!frame) return res.status(200).json({ status: false, message: "Frame not found" });

    if (fs.existsSync(frame.image)) {
      fs.unlinkSync(frame.image);
    }

    await frame.deleteOne();

    return res.status(200).json({ status: true, message: "Frame Deleted Successfully" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
