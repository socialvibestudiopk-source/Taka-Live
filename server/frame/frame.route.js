const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = require("../../util/multer");
const upload = multer({ storage });

const FrameController = require("./frame.controller");
const AdminMiddleware = require("../middleware/admin.middleware");

router.get("/", AdminMiddleware, FrameController.index);
router.post("/", AdminMiddleware, upload.single("image"), FrameController.store);
router.patch("/:id", AdminMiddleware, upload.single("image"), FrameController.update);
router.patch("/:id/toggle", AdminMiddleware, FrameController.toggleActive);
router.delete("/:id", AdminMiddleware, FrameController.destroy);

module.exports = router;
