const User = require("../user/user.model");
const fcm = require("../../util/fcm");

exports.broadcast = async (req, res) => {
  try {
    const { title, message, image } = req.body;
    if (!title || !message) return res.status(200).json({ status: false, message: "Title and message are required" });

    // Fetch all user tokens
    const users = await User.find({ fcmToken: { $ne: "" } }).select("fcmToken");
    const tokens = users.map(u => u.fcmToken);

    if (tokens.length === 0) return res.status(200).json({ status: false, message: "No active users found to notify" });

    const payload = {
      registration_ids: tokens, // Send to many
      notification: {
        title: title,
        body: message,
        image: image || ""
      }
    };

    // Sending in chunks if needed (handled by util/fcm)
    await fcm.send(payload, (err, response) => {
        if (err) console.error("Broadcast failed:", err);
    });

    return res.status(200).json({ status: true, message: `Notification sent to ${tokens.length} users` });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
