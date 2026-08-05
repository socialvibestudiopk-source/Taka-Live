const Agency = require("./agency.model");

exports.index = async (req, res) => {
  try {
    const agencies = await Agency.find();
    return res.status(200).json({ status: true, message: "Success", agencies });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
