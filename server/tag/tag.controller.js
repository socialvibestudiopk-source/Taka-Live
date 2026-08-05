const Tag = require("./tag.model");

exports.index = async (req, res) => {
  try {
    const tags = await Tag.find();
    return res.status(200).json({ status: true, message: "Success", tags });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
