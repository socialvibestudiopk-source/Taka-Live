const express = require("express");
const router = express.Router();
const AssetController = require("./asset.controller");
const { isOwner } = require("../middleware/authority.middleware");
const multer = require("multer");
const storage = require("../../util/multer");
const upload = multer({ storage });

const checkAccessWithKey = require("../../checkAccess");

// Public/App Side
router.get("/user/inventory", checkAccessWithKey(), AssetController.getUserInventory);

// Owner Side - Asset Management
router.get("/", isOwner, AssetController.index);
router.post("/", isOwner, upload.single("image"), AssetController.store);
router.patch("/:id", isOwner, upload.single("image"), AssetController.update);
router.delete("/:id", isOwner, AssetController.destroy);

// Owner Side - Assignment & Equipment
router.post("/assign", isOwner, AssetController.assignToUser);
router.post("/equip", isOwner, AssetController.equipAsset);

// Owner Side - Role Asset Rules
router.get("/rules/all", isOwner, AssetController.getRules);
router.post("/rules", isOwner, AssetController.storeRule);
router.patch("/rules/:id", isOwner, AssetController.updateRule);
router.delete("/rules/:id", isOwner, AssetController.destroyRule);

module.exports = router;
