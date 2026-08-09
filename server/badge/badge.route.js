const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = require("../../util/multer");
const upload = multer({ storage });

const BadgeController = require("./badge.controller");
const AdminMiddleware = require("../middleware/admin.middleware");

router.get("/", AdminMiddleware, BadgeController.index);
router.post("/", AdminMiddleware, upload.single("image"), BadgeController.store);
router.patch("/:id", AdminMiddleware, upload.single("image"), BadgeController.update);
router.delete("/:id", AdminMiddleware, BadgeController.destroy);

module.exports = router;
