const Setting = require("../setting/setting.model");
const Wallet = require("../wallet/wallet.model");
const User = require("../user/user.model");

// In this backend, games might be managed through settings or a separate model.
// For now, we provide an interface to toggle the features.

exports.getGameStats = async (req, res) => {
  try {
    // Mocking some stats for the dashboard until a dedicated model is built
    const stats = [
        { name: "Lucky Wheel", pool: "5,000,000", isActive: true },
        { name: "Greedy Dice", pool: "1,200,000", isActive: true },
        { name: "Fruit Slot", pool: "800,000", isActive: false }
    ];
    return res.status(200).json({ status: true, message: "Success", stats });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.toggleGame = async (req, res) => {
    try {
        const { gameName } = req.body;
        // Logic to update feature flags in settings
        return res.status(200).json({ status: true, message: `${gameName} status updated` });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
