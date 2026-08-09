const express = require("express");
const router = express.Router();
const VIPManagementController = require("./vipManagement.controller");
const checkAccessWithKey = require("../../checkAccess");

// VIP Config
router.get("/config", checkAccessWithKey(), VIPManagementController.getConfig);
router.patch("/config/update", checkAccessWithKey(), VIPManagementController.updateConfig);

// VIP Levels
router.get("/levels", checkAccessWithKey(), VIPManagementController.getLevels);
router.post("/level/add", checkAccessWithKey(), VIPManagementController.addLevel);
router.patch("/level/edit/:id", checkAccessWithKey(), VIPManagementController.editLevel);
router.delete("/level/delete/:id", checkAccessWithKey(), VIPManagementController.deleteLevel);

// VIP Assets/Rewards
router.get("/rewards", checkAccessWithKey(), VIPManagementController.getRewards);
router.post("/reward/add", checkAccessWithKey(), VIPManagementController.addReward);
router.patch("/reward/edit/:id", checkAccessWithKey(), VIPManagementController.editReward);
router.delete("/reward/delete/:id", checkAccessWithKey(), VIPManagementController.deleteReward);

// VIP Users
router.get("/users", checkAccessWithKey(), VIPManagementController.getVipUsers);
router.post("/user/assign", checkAccessWithKey(), VIPManagementController.assignVip);
router.post("/user/remove", checkAccessWithKey(), VIPManagementController.removeVip);

// Stats
router.get("/overview", checkAccessWithKey(), VIPManagementController.getOverview);

module.exports = router;
