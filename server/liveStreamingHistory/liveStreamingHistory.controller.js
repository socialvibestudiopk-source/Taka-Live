const LiveStreamingHistory = require("./liveStreamingHistory.model");
const User = require("../user/user.model");
const LiveUser = require("../liveUser/liveUser.model");
const moment = require("moment");

// get streaming summary
exports.getStreamingSummary = async (req, res) => {
  try {
    const liveStreamingHistory = await LiveStreamingHistory.findById(
      req.query.liveStreamingId
    );

    if (!liveStreamingHistory)
      return res
        .status(200)
        .json({ status: false, message: "Live Streaming Id not Found!!" });

    // remove user from live
    const user = await User.findById(liveStreamingHistory.userId);
    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    }
    user.isBusy = false;
    await user.save();
    // await LiveUser.findOneAndDelete({ liveUserId: user._id });

    liveStreamingHistory.endTime = new Date().toLocaleString();

    console.log(
      "startTime -----------------------------------",
      liveStreamingHistory.startTime
    );
    console.log(
      "endTime -------------------------------------",
      liveStreamingHistory.endTime
    );
    liveStreamingHistory.duration = moment
      .utc(
        moment(new Date(liveStreamingHistory.endTime)).diff(
          moment(new Date(liveStreamingHistory.startTime))
        )
      )
      .format("HH:mm:ss");
    await liveStreamingHistory.save();

    return res.status(200).json({
      status: true,
      message: "Success!!",
      liveStreamingHistory,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};
