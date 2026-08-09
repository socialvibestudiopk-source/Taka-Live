const Asset = require("./asset.model");
const AssetInventory = require("./assetInventory.model");
const RoleAssetRule = require("./roleAssetRule.model");
const AssetAuditLog = require("./assetAuditLog.model");
const User = require("../user/user.model");
const fs = require("fs");
const path = require("path");

// Log helper
const logAction = async (data) => {
    try {
        const log = new AssetAuditLog(data);
        await log.save();
    } catch (e) {
        console.error("Failed to log asset action:", e.message);
    }
};

exports.index = async (req, res) => {
  try {
    const { type, category, isActive } = req.query;
    let query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const assets = await Asset.find(query).sort({ displayOrder: 1, createdAt: -1 });
    return res.status(200).json({ status: true, message: "Success", assets });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.store = async (req, res) => {
  try {
    if (!req.file) return res.status(200).json({ status: false, message: "Asset image is required" });

    const asset = new Asset(req.body);
    asset.image = req.file.path;
    await asset.save();

    await logAction({
        actorId: req.admin?._id,
        actorRole: req.admin?.role,
        assetId: asset._id,
        action: "ASSET_CREATED",
        details: `Created asset: ${asset.name} (${asset.type})`
    });

    return res.status(200).json({ status: true, message: "Asset created successfully", asset });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.update = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(200).json({ status: false, message: "Asset not found" });

        const previousState = asset.toObject();

        if (req.file) {
            if (fs.existsSync(asset.image)) fs.unlinkSync(asset.image);
            asset.image = req.file.path;
        }

        Object.assign(asset, req.body);
        await asset.save();

        await logAction({
            actorId: req.admin?._id,
            actorRole: req.admin?.role,
            assetId: asset._id,
            action: "ASSET_UPDATED",
            previousState,
            newState: asset.toObject()
        });

        return res.status(200).json({ status: true, message: "Asset updated successfully", asset });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.destroy = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(200).json({ status: false, message: "Asset not found" });

        if (fs.existsSync(asset.image)) fs.unlinkSync(asset.image);

        await logAction({
            actorId: req.admin?._id,
            actorRole: req.admin?.role,
            assetId: asset._id,
            action: "ASSET_DELETED",
            details: `Deleted asset: ${asset.name}`
        });

        await asset.deleteOne();
        return res.status(200).json({ status: true, message: "Asset deleted successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Owner Manual Assignment / Gift
exports.assignToUser = async (req, res) => {
    try {
        const { userId, assetId, quantity = 1, duration = 0, autoEquip = false, source = "OWNER_ASSIGNMENT", reason } = req.body;

        const user = await User.findById(userId);
        const asset = await Asset.findById(assetId);

        if (!user || !asset) return res.status(200).json({ status: false, message: "User or Asset not found" });

        let expiration = null;
        if (duration > 0) {
            expiration = new Date();
            expiration.setDate(expiration.getDate() + duration);
        }

        // Upsert inventory
        let inventory = await AssetInventory.findOne({ userId, assetId });
        if (inventory) {
            inventory.quantity += quantity;
            inventory.expiration = expiration;
            inventory.active = true;
        } else {
            inventory = new AssetInventory({
                userId,
                assetId,
                assetType: asset.type,
                quantity,
                source,
                assignedBy: req.admin?._id,
                expiration
            });
        }

        if (autoEquip) {
            // Unequip current of same type
            await AssetInventory.updateMany({ userId, assetType: asset.type }, { equipped: false });
            inventory.equipped = true;

            // Update user profile record for fast lookup
            const updateField = asset.type.toLowerCase() === 'frame' ? 'frame' :
                               asset.type.toLowerCase() === 'badge' ? 'badges' : null;

            if (updateField === 'frame') {
                user.frame = asset._id;
            } else if (updateField === 'badges') {
                if (!user.badges.includes(asset._id)) user.badges.push(asset._id);
            }
            await user.save();
        }

        await inventory.save();

        await logAction({
            actorId: req.admin?._id,
            actorRole: req.admin?.role,
            targetUserId: user._id,
            assetId: asset._id,
            action: source === "OWNER_GIFT" ? "ASSET_GIFTED" : "ASSET_ASSIGNED",
            details: reason
        });

        return res.status(200).json({ status: true, message: "Asset assigned successfully", inventory });

    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Equip Logic
exports.equipAsset = async (req, res) => {
    try {
        const { userId, assetId } = req.body;
        const inventory = await AssetInventory.findOne({ userId, assetId, active: true });
        if (!inventory) return res.status(200).json({ status: false, message: "Asset not found in inventory" });

        const asset = await Asset.findById(assetId);

        // Unequip others of same type
        await AssetInventory.updateMany({ userId, assetType: inventory.assetType }, { equipped: false });

        inventory.equipped = true;
        await inventory.save();

        // Update User Profile
        const user = await User.findById(userId);
        if (inventory.assetType === "FRAME") user.frame = assetId;
        if (inventory.assetType === "BADGE") {
            if (!user.badges.includes(assetId)) user.badges.push(assetId);
        }
        await user.save();

        return res.status(200).json({ status: true, message: "Asset equipped successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Internal utility to apply role rules (Call this from user role update)
exports.applyRoleAssetRules = async (userId, newRole) => {
    try {
        const rules = await RoleAssetRule.find({ role: newRole.toUpperCase(), status: true });
        for (const rule of rules) {
            const asset = await Asset.findById(rule.assetId);
            if (!asset) continue;

            // Auto Assign
            if (rule.autoAssign) {
                let inventory = await AssetInventory.findOne({ userId, assetId: rule.assetId });
                if (!inventory) {
                    inventory = new AssetInventory({
                        userId,
                        assetId: rule.assetId,
                        assetType: asset.type,
                        source: "ROLE_AUTO_ASSIGN",
                        roleAssigned: newRole.toUpperCase()
                    });
                }

                if (rule.autoEquip) {
                    await AssetInventory.updateMany({ userId, assetType: asset.type }, { equipped: false });
                    inventory.equipped = true;

                    const user = await User.findById(userId);
                    if (asset.type === "FRAME") user.frame = asset._id;
                    await user.save();
                }
                await inventory.save();
            }
        }
    } catch (e) {
        console.error("Error applying role asset rules:", e.message);
    }
};

// Role Asset Rules
exports.getRules = async (req, res) => {
    try {
        const rules = await RoleAssetRule.find().populate("assetId");
        return res.status(200).json({ status: true, message: "Success", rules });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.storeRule = async (req, res) => {
    try {
        const rule = new RoleAssetRule(req.body);
        await rule.save();

        await logAction({
            actorId: req.admin?._id,
            actorRole: req.admin?.role,
            action: "ROLE_ASSET_RULE_CREATED",
            details: `Rule for ${rule.role} with asset ${rule.assetId}`
        });

        return res.status(200).json({ status: true, message: "Rule created successfully", rule });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.updateRule = async (req, res) => {
    try {
        const rule = await RoleAssetRule.findById(req.params.id);
        if (!rule) return res.status(200).json({ status: false, message: "Rule not found" });

        Object.assign(rule, req.body);
        await rule.save();

        await logAction({
            actorId: req.admin?._id,
            actorRole: req.admin?.role,
            action: "ROLE_ASSET_RULE_UPDATED",
            details: `Rule updated for ${rule.role}`
        });

        return res.status(200).json({ status: true, message: "Rule updated successfully", rule });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.destroyRule = async (req, res) => {
    try {
        const rule = await RoleAssetRule.findById(req.params.id);
        if (!rule) return res.status(200).json({ status: false, message: "Rule not found" });

        await logAction({
            actorId: req.admin?._id,
            actorRole: req.admin?.role,
            action: "ROLE_ASSET_RULE_DISABLED",
            details: `Rule deleted for ${rule.role}`
        });

        await rule.deleteOne();
        return res.status(200).json({ status: true, message: "Rule deleted successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Inventory fetch
exports.getUserInventory = async (req, res) => {
    try {
        const userId = req.query.userId || req.user?._id;
        const inventory = await AssetInventory.find({ userId, active: true }).populate("assetId");
        return res.status(200).json({ status: true, message: "Success", inventory });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
