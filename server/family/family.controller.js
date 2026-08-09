const Family = require("./family.model");
const User = require("../user/user.model");
const Wallet = require("../wallet/wallet.model");

// Create Family
exports.store = async (req, res) => {
  try {
    if (!req.body.name || !req.body.ownerId) {
      return res.status(200).json({ status: false, message: "Invalid details!" });
    }

    const user = await User.findById(req.body.ownerId);
    if (!user) return res.status(200).json({ status: false, message: "User not found!" });

    // Check balance (50,000 diamonds required)
    if (user.diamond < 50000) {
      return res.status(200).json({ status: false, message: "Insufficient diamonds to create a family!" });
    }

    const family = new Family();
    family.name = req.body.name;
    family.description = req.body.description || "Welcome to join us!";
    family.ownerId = user._id;
    family.members.push(user._id);
    family.uniqueId = Math.floor(Math.random() * 900000) + 100000;
    family.image = req.file ? req.file.path : "";

    await family.save();

    // Deduct coins and record in wallet
    user.diamond -= 50000;
    await user.save();

    const wallet = new Wallet();
    wallet.userId = user._id;
    wallet.diamond = 50000;
    wallet.type = 7; // Family creation type
    wallet.isIncome = false;
    wallet.date = new Date().toLocaleString();
    await wallet.save();

    return res.status(200).json({ status: true, message: "Family created successfully!", family });

  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Get All Families
exports.index = async (req, res) => {
  try {
    const families = await Family.find()
      .populate("ownerId", "name username image")
      .sort({ totalDiamonds: -1 });
    return res.status(200).json({ status: true, message: "Success", families });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Join Family
exports.join = async (req, res) => {
    try {
      const { userId, familyId } = req.body;
      const user = await User.findById(userId);
      if (user.familyId) return res.status(200).json({ status: false, message: "Already in a family" });

      const family = await Family.findById(familyId);
      if (!family) return res.status(200).json({ status: false, message: "Family not found" });

      family.members.push(userId);
      await family.save();

      user.familyId = familyId;
      await user.save();

      return res.status(200).json({ status: true, message: "Joined family successfully", family });
    } catch (error) {
      return res.status(500).json({ status: false, error: error.message });
    }
};

// Leave Family
exports.leave = async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await User.findById(userId);
      if (!user.familyId) return res.status(200).json({ status: false, message: "Not in a family" });

      const family = await Family.findById(user.familyId);
      if (family) {
          if (family.ownerId.toString() === userId) {
              return res.status(200).json({ status: false, message: "Owner cannot leave family. Delete it instead." });
          }
          family.members = family.members.filter(m => m.toString() !== userId);
          await family.save();
      }

      user.familyId = null;
      await user.save();

      return res.status(200).json({ status: true, message: "Left family successfully" });
    } catch (error) {
      return res.status(500).json({ status: false, error: error.message });
    }
};
