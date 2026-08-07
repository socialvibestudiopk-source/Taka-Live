const express = require("express");
const router = express.Router();
const OwnerController = require("./owner.controller");
const ownerAuth = require("../../middleware/ownerAuth");

router.get("/stats", ownerAuth, OwnerController.getDashboardStats);

module.exports = router;
