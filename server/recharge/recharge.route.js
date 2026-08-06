const express = require("express");
const router = express.Router();
const RechargeController = require("./recharge.controller");
const AdminMiddleware = require("../middleware/admin.middleware");

router.get("/", AdminMiddleware, RechargeController.index);
router.patch("/:rechargeId", AdminMiddleware, RechargeController.updateStatus);

module.exports = router;
