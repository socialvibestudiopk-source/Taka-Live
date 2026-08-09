const express = require("express");
const router = express.Router();

const DashboardController = require("../dashboard/dashboard.controller");
const UserController = require("../user/user.controller");
const FinanceController = require("./finance.controller");
const { isOwner } = require("../middleware/authority.middleware");

// Core Stats
router.get("/stats", isOwner, DashboardController.getOwnerStats);

// Financial Command
router.get("/finance/analytics", isOwner, FinanceController.getFinanceAnalytics);
router.get("/finance/transactions", isOwner, FinanceController.getTransactionHistory);

// Staff & Role Management
router.get("/staff/list", isOwner, UserController.getStaffList);
router.patch("/staff/assign-role/:userId", isOwner, UserController.updateRole);

// BD & BD Leader Management
router.get("/bd-leaders", isOwner, UserController.getBDLeaderList);
router.get("/bds", isOwner, UserController.getBDList);

// Financial Audit
// Add specific owner financial routes here

module.exports = router;
