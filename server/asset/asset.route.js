const express = require("express");
const router = express.Router();
const AssetController = require("./asset.controller");
const { isOwner } = require("../middleware/authority.middleware");
const multer = require("multer");
const storage = require("../../util/multer");
const upload = multer({ storage });

router.get("/", isOwner, AssetController.index);
router.post("/", isOwner, upload.single("image"), AssetController.store);
router.patch("/:id", isOwner, upload.single("image"), AssetController.update);
router.delete("/:id", isOwner, AssetController.destroy);
router.post("/assign", isOwner, AssetController.assignToUser);

module.exports = router;
