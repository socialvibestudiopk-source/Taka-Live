const Setting = require("./setting.model");
const prisma = require("../../prisma");
const mongoose = require("mongoose");

// get setting data
exports.index = async (req, res) => {
  try {
    // --- PRISMA (SUPABASE) ---
    try {
        let sSetting = await prisma.setting.findFirst();
        if (!sSetting) {
            sSetting = await prisma.setting.create({ data: { is_app_active: true } });
        }
        if (sSetting) {
            return res.status(200).json({ status: true, message: "Success (Prisma)!!", setting: sSetting });
        }
    } catch (e) { console.warn("Prisma Setting Error:", e.message); }

    // --- MONGO FALLBACK ---
    let setting = await Setting.findOne({});
    if (!setting) {
        setting = new Setting();
        await setting.save();
    }
    return res.status(200).json({ status: true, message: "Success (Legacy)!!", setting });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// update the setting data
exports.update = async (req, res) => {
  try {
    const { settingId } = req.params;

    // 1. Try Prisma Update
    try {
        const updated = await prisma.setting.update({
            where: { id: settingId },
            data: {
                referral_bonus: req.body.referralBonus ? Number(req.body.referralBonus) : undefined,
                login_bonus: req.body.loginBonus ? Number(req.body.loginBonus) : undefined,
                agora_key: req.body.agoraKey,
                agora_certificate: req.body.agoraCertificate,
                is_app_active: req.body.isAppActive,
                maintenance_message: req.body.maintenanceMessage,
                android_version: req.body.androidVersion,
                android_force_update: req.body.androidForceUpdate,
                android_update_link: req.body.androidUpdateLink,
            }
        });
        // Sync with Mongo
        await Setting.updateOne({ _id: settingId }, { $set: req.body });
        return res.status(200).json({ status: true, message: "Settings updated (Prisma)", setting: updated });
    } catch (e) { console.warn("Prisma Update Error:", e.message); }

    // Fallback
    const setting = await Setting.findById(settingId);
    if (!setting) return res.status(200).json({ status: false, message: "Setting not found" });

    Object.assign(setting, req.body);
    await setting.save();

    return res.status(200).json({ status: true, message: "Settings updated (Legacy)", setting });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// handle setting switch
exports.handleSwitch = async (req, res) => {
  try {
    const { settingId } = req.params;
    const { type } = req.query;

    // Try Prisma
    try {
        const sSetting = await prisma.setting.findUnique({ where: { id: settingId } });
        if (sSetting) {
            let data = {};
            if (type === "googlePlay") data.google_play_switch = !sSetting.google_play_switch;
            else if (type === "stripe") data.stripe_switch = !sSetting.stripe_switch;
            else data.is_app_active = !sSetting.is_app_active;

            const updated = await prisma.setting.update({ where: { id: settingId }, data });
            return res.status(200).json({ status: true, message: "Success (Prisma)!!", setting: updated });
        }
    } catch (e) {}

    // Fallback
    const setting = await Setting.findById(settingId);
    if (!setting) return res.status(200).json({ status: false, message: "Setting not found" });

    if (type === "googlePlay") setting.googlePlaySwitch = !setting.googlePlaySwitch;
    else if (type === "stripe") setting.stripeSwitch = !setting.stripeSwitch;
    else setting.isAppActive = !setting.isAppActive;

    await setting.save();
    return res.status(200).json({ status: true, message: "Success!!", setting });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
