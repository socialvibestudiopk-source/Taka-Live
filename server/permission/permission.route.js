const express = require("express");
const router = express.Router();
const PermissionController = require("./permission.controller");
const { isOwner } = require("../middleware/authority.middleware");

router.get("/", isOwner, PermissionController.getPermissions);
router.post("/update", isOwner, PermissionController.updateRolePermissions);

module.exports = router;
