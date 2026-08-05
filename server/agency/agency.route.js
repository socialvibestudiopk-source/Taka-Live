const express = require("express");
const router = express.Router();
const AgencyController = require("./agency.controller");
const AdminMiddleware = require("../middleware/admin.middleware");

router.get("/", AdminMiddleware, AgencyController.index);

module.exports = router;
