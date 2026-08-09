const Badge = require("./badge.model");
const fs = require("fs");

exports.index = async (req, res) => {
  try {
    const badges = await Badge.find().sort({ createdAt: -1 });
    return res.status(200).json({ status: true, message: "Success", badges });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.store = async (req, res) => {
  try {
    if (!req.body.name || !req.file) {
      return res.status(200).json({ status: false, message: "Invalid Details!" });
    }

    const badge = new Badge();
    badge.name = req.body.name;
    badge.image = req.file.path;
    badge.type = req.body.type || "ACHIEVEMENT";
    badge.is_animated = req.body.is_animated === "true" || req.body.is_animated === true;

    await badge.save();

    return res.status(200).json({ status: true, message: "Badge Created Successfully", badge });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) return res.status(200).json({ status: false, message: "Badge not found" });

    if (req.file) {
      if (fs.existsSync(badge.image)) {
        fs.unlinkSync(badge.image);
      }
      badge.image = req.file.path;
    }

    badge.name = req.body.name || badge.name;
    badge.type = req.body.type || badge.type;
    badge.is_animated = req.body.is_animated !== undefined ? (req.body.is_animated === "true" || req.body.is_animated === true) : badge.is_animated;

    await badge.save();

    return res.status(200).json({ status: true, message: "Badge Updated Successfully", badge });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.destroy = async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) return res.status(200).json({ status: false, message: "Badge not found" });

    if (fs.existsSync(badge.image)) {
      fs.unlinkSync(badge.image);
    }

    await badge.deleteOne();

    return res.status(200).json({ status: true, message: "Badge Deleted Successfully" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
