const express = require("express");
const router = express.Router();
const CommissionController = require("./commission.controller");
const ownerAuth = require("../../middleware/ownerAuth");

router.get("/", ownerAuth, CommissionController.index);
router.post("/", ownerAuth, CommissionController.store);
router.patch("/:id", ownerAuth, CommissionController.update);

module.exports = router;
