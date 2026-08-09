const express = require("express");
const router = express.Router();

const SuperAdminController = require("./superAdmin.controller");
const PermissionController = require("./permission.controller");
const { isSuperAdmin, isOwner } = require("../middleware/authority.middleware");

router.get("/stats", isSuperAdmin, SuperAdminController.getDashboardStats);
router.get("/bds", isSuperAdmin, SuperAdminController.getBDList);
router.get("/agencies", isSuperAdmin, SuperAdminController.getAgencyList);
router.get("/bd-leaders", isSuperAdmin, SuperAdminController.getBDLeaderList);

router.post("/invite", isSuperAdmin, SuperAdminController.createInvitation);
router.post("/ban", isSuperAdmin, SuperAdminController.banUser);

// Owner only: Manage SA Permissions
router.get("/permissions/:userId", isOwner, PermissionController.getPermissions);
router.patch("/permissions/update", isOwner, PermissionController.updatePermissions);

module.exports = router;
