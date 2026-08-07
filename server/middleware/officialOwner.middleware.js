const User = require("../user/user.model");

module.exports = async (req, res, next) => {
  try {
    const userId = req.user._id; // Populated by JWT middleware
    const user = await User.findById(userId);

    if (!user || user.role !== "OFFICIAL_OWNER") {
      return res.status(403).json({
        status: false,
        message: "Access Denied: Unrestricted Owner Authority Required.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
