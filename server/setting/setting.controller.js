const Setting = require("./setting.model");
const mongoose = require("mongoose");

// get setting data
exports.index = async (req, res) => {
  try {
    // FAIL-SAFE: Return dummy settings if DB is not connected
    if (mongoose.connection.readyState !== 1) {
        return res.status(200).json({
            status: true,
            message: "Success (Offline Mode)!!",
            setting: {
                referralBonus: 0,
                agoraKey: "",
                agoraCertificate: "",
                isAppActive: true,
                maintenanceMessage: "Offline Mode",
                privacyPolicyLink: "",
                privacyPolicyText: "",
                chatCharge: 0,
                callCharge: 0,
                googlePlaySwitch: false,
                stripeSwitch: false,
                currency: "$",
                rCoinForCashOut: 100,
                rCoinForDiamond: 100,
                minRcoinForCashOut: 1000,
                paymentGateway: [],
                loginBonus: 0
            }
        });
    }

    let setting = await Setting.findOne({});

    if (!setting) {
        // Create default setting if none exists
        setting = new Setting();
        setting.referralBonus = 0;
        setting.agoraKey = "";
        setting.agoraCertificate = "";
        setting.isAppActive = true;
        setting.maintenanceMessage = "Server is under maintenance. Please try again later.";
        setting.privacyPolicyLink = "";
        setting.privacyPolicyText = "";
        setting.chatCharge = 0;
        setting.callCharge = 0;
        setting.googlePlaySwitch = false;
        setting.stripeSwitch = false;
        setting.currency = "$";
        setting.rCoinForCashOut = 100;
        setting.rCoinForDiamond = 100;
        setting.minRcoinForCashOut = 1000;
        setting.paymentGateway = [];
        setting.loginBonus = 0;
        await setting.save();
    }

    return res.status(200).json({ status: true, message: "Success!!", setting })
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" })
  }
}

exports.store = async (req, res) => {
  try {
    const setting = new Setting();

    setting.referralBonus = 20;

    await setting.save();

    return res.status(200).json({ status: true, message: "Success!!", setting })
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
}

// update the setting data
exports.update = async (req, res) => {
  try {

    const setting = await Setting.findById(req.params.settingId);

    if (!setting) return res.status(200).json({ status: false, message: "Setting data does not Exist!" });

    setting.referralBonus = req.body.referralBonus;
    setting.agoraKey = req.body.agoraKey;
    setting.agoraCertificate = req.body.agoraCertificate;
    setting.maxSecondForVideo = req.body.maxSecondForVideo;
    setting.privacyPolicyLink = req.body.privacyPolicyLink;
    setting.privacyPolicyText = req.body.privacyPolicyText;
    setting.chatCharge = req.body.chatCharge;
    setting.callCharge = req.body.callCharge;
    setting.googlePlayEmail = req.body.googlePlayEmail;
    setting.googlePlayKey = req.body.googlePlayKey;
    setting.stripePublishableKey = req.body.stripePublishableKey;
    setting.stripeSecretKey = req.body.stripeSecretKey;
    setting.currency = req.body.currency;
    setting.rCoinForCashOut = req.body.rCoinForCaseOut;
    setting.rCoinForDiamond = req.body.rCoinForDiamond;
    setting.minRcoinForCashOut = req.body.minRcoinForCaseOut;
    setting.paymentGateway = req.body.paymentGateway || setting.paymentGateway;
    setting.loginBonus = req.body.loginBonus || setting.loginBonus;

    // New Executive Controls
    if (req.body.isAppActive !== undefined) setting.isAppActive = req.body.isAppActive;
    if (req.body.maintenanceMessage !== undefined) setting.maintenanceMessage = req.body.maintenanceMessage;
    if (req.body.androidVersion !== undefined) setting.androidVersion = req.body.androidVersion;
    if (req.body.androidForceUpdate !== undefined) setting.androidForceUpdate = req.body.androidForceUpdate;
    if (req.body.androidUpdateLink !== undefined) setting.androidUpdateLink = req.body.androidUpdateLink;
    if (req.body.locationApiKey !== undefined) setting.locationApiKey = req.body.locationApiKey;

    await setting.save();

    return res.status(200).json({ status: true, message: "Success!!", setting })

  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
}

// handle setting switch
exports.handleSwitch = async (req, res) => {
  try {
    const setting = await Setting.findById(req.params.settingId);

    if (!setting) return res.status(200).json({ status: false, message: "Setting data does not Exist!" });

    if (req.query.type === "googlePlay") {
      setting.googlePlaySwitch = !setting.googlePlaySwitch
    } else if (req.query.type === "stripe") {
      setting.stripeSwitch = !setting.stripeSwitch;
    } else {
      setting.isAppActive = !setting.isAppActive;
    }

    await setting.save();

    return res.status(200).json({ status: true, message: "Success!!", setting })
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" })
  }
}
