const Withdraw = require("./withdraw.model");
const User = require("../user/user.model");
const Wallet = require("../wallet/wallet.model");

// Get all requests
exports.index = async (req, res) => {
  try {
    const withdraw = await Withdraw.find().populate("userId").sort({ createdAt: -1 });
    return res.status(200).json({ status: true, message: "Success", withdraw });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Update status (Approve/Reject)
exports.updateStatus = async (req, res) => {
  try {
    const withdraw = await Withdraw.findById(req.params.withdrawId);
    if (!withdraw) return res.status(200).json({ status: false, message: "Request not found" });

    if (req.body.status == 1) { // Approved
        withdraw.status = 1;
    } else if (req.body.status == 2) { // Rejected
        withdraw.status = 2;
        // Refund coins to user
        const user = await User.findById(withdraw.userId);
        if (user) {
            user.rCoin += withdraw.rCoin;
            await user.save();
        }
    }

    await withdraw.save();
    return res.status(200).json({ status: true, message: "Status updated" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
