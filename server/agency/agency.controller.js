const Agency = require("./agency.model");
const User = require("../user/user.model");

exports.index = async (req, res) => {
  try {
    const agencies = await Agency.find({ isDeleted: false })
      .populate("ownerId", "name username uniqueId image")
      .populate("bdId", "name uniqueId")
      .sort({ createdAt: -1 });

    return res.status(200).json({ status: true, message: "Success", agencies });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.updateAgencyStatus = async (req, res) => {
    try {
        const agency = await Agency.findById(req.params.id);
        if (!agency) return res.status(200).json({ status: false, message: "Agency not found" });

        agency.status = req.body.status !== undefined ? req.body.status : !agency.status;
        await agency.save();

        return res.status(200).json({ status: true, message: "Agency status updated", agency });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.assignBD = async (req, res) => {
    try {
        const { bdId } = req.body;
        const agency = await Agency.findById(req.params.id);
        if (!agency) return res.status(200).json({ status: false, message: "Agency not found" });

        agency.bdId = bdId;
        await agency.save();

        return res.status(200).json({ status: true, message: "BD assigned to agency successfully", agency });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
