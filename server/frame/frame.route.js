const express = require("express");
const router = express.Router();
const FrameController = require("./frame.controller");
const AdminMiddleware = require("../middleware/admin.middleware");

router.get("/", AdminMiddleware, FrameController.index);

module.exports = router;
