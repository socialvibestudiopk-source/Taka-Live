const User = require("../user/user.model");

module.exports = async (req, res, next) => {
  try {
    const userId = req.user._id; // Assumes JWT middleware already populated req.user
    const user = await User.findById(userId);

    if (!user || user.role !== "OFFICIAL") {
      return res.status(403).json({
        status: false,
        message: "Access Denied: Highest Authority Required.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
