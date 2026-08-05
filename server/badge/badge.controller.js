const Badge = require("./badge.model");

exports.index = async (req, res) => {
  try {
    const badges = await Badge.find();
    return res.status(200).json({ status: true, message: "Success", badges });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
