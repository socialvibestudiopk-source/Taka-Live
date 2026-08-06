const Recharge = require("./recharge.model");
const User = require("../user/user.model");

exports.index = async (req, res) => {
  try {
    const recharge = await Recharge.find().populate("userId").sort({ createdAt: -1 });
    return res.status(200).json({ status: true, message: "Success", recharge });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const recharge = await Recharge.findById(req.params.rechargeId);
    if (!recharge) return res.status(200).json({ status: false, message: "Order not found" });

    if (req.body.status == 1 && recharge.status !== 1) { // Success
        recharge.status = 1;
        const user = await User.findById(recharge.userId);
        if (user) {
            user.diamond += recharge.coin;
            await user.save();
        }
    } else {
        recharge.status = req.body.status;
    }

    await recharge.save();
    return res.status(200).json({ status: true, message: "Status updated" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
