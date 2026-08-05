const express = require("express");
const router = express.Router();
const TagController = require("./tag.controller");
const AdminMiddleware = require("../middleware/admin.middleware");

router.get("/", AdminMiddleware, TagController.index);

module.exports = router;
