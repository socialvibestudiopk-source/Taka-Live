const express = require("express");
const router = express.Router();
const FinanceController = require("./finance.controller");
const AdminMiddleware = require("../middleware/admin.middleware");

router.get("/analytics", AdminMiddleware, FinanceController.analytics);
router.get("/transactions", AdminMiddleware, FinanceController.transactions);

module.exports = router;
