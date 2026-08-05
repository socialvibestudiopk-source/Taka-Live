const express = require("express");
const router = express.Router();
const BadgeController = require("./badge.controller");
const AdminMiddleware = require("../middleware/admin.middleware");

router.get("/", AdminMiddleware, BadgeController.index);

module.exports = router;
