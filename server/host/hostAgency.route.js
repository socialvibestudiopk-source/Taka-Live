const express = require("express");
const router = express.Router();
const HostAgencyController = require("./hostAgency.controller");
const checkAccessWithKey = require("../../checkAccess");

router.get("/dashboard", checkAccessWithKey(), HostAgencyController.getDashboard);
router.get("/policies", checkAccessWithKey(), HostAgencyController.getPolicies);

// Host Actions
router.get("/search-agency", checkAccessWithKey(), HostAgencyController.searchAgency);
router.post("/apply", checkAccessWithKey(), HostAgencyController.applyToAgency);

// Agency Actions
router.post("/invite-host", checkAccessWithKey(), HostAgencyController.inviteHost);
router.post("/review-application", checkAccessWithKey(), HostAgencyController.reviewApplication);

module.exports = router;
