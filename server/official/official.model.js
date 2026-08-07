const mongoose = require("mongoose");

const officialSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    appSettings: {
      appName: { type: String, default: "Taka Live" },
      maintenanceMode: { type: Boolean, default: false },
      forceUpdate: { type: Boolean, default: false },
      minVersion: { type: String, default: "1.0.0" },
      latestVersion: { type: String, default: "1.1.0" },
      loginOptions: {
        google: { type: Boolean, default: true },
        phone: { type: Boolean, default: true },
        guest: { type: Boolean, default: true },
      },
      featureToggle: {
        audioRoom: { type: Boolean, default: true },
        videoLive: { type: Boolean, default: false }, // Coming Soon
        withdraw: { type: Boolean, default: true },
        recharge: { type: Boolean, default: true },
      }
    },
    serverKeys: {
      agoraAppId: String,
      agoraCertificate: String,
      firebaseKey: String,
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Official", officialSchema);
