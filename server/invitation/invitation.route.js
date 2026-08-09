const express = require("express");
const router = express.Router();
const InvitationController = require("./invitation.controller");
const { isOwner } = require("../middleware/authority.middleware");

// Owner/Admin Side
router.post("/send", isOwner, InvitationController.inviteRole);
router.get("/list", isOwner, InvitationController.getInvitations);
router.patch("/cancel/:id", isOwner, InvitationController.cancelInvitation);

// Mobile App Side (User Context) - In a real scenario, this would use User auth middleware
router.post("/handle", InvitationController.handleInvitation);

module.exports = router;
