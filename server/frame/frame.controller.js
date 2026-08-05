const Frame = require("./frame.model");

exports.index = async (req, res) => {
  try {
    const frames = await Frame.find();
    return res.status(200).json({ status: true, message: "Success", frames });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
