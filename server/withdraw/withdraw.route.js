const express = require("express");
const router = express.Router();
const WithdrawController = require("./withdraw.controller");
const AdminMiddleware = require("../middleware/admin.middleware");

router.get("/", AdminMiddleware, WithdrawController.index);
router.patch("/:withdrawId", AdminMiddleware, WithdrawController.updateStatus);

module.exports = router;
