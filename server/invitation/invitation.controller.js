const Invitation = require("./invitation.model");
const User = require("../user/user.model");
const Admin = require("../admin/admin.model");
const Notification = require("../notification/notification.model");
const crypto = require("crypto");
const dayjs = require("dayjs");

exports.inviteRole = async (req, res) => {
    try {
        const { userId, role, commission, region, message, expiryDays = 7, bdLeaderId, bdId, agencyId } = req.body;

        if (!role || !userId) {
            return res.status(200).json({ status: false, message: "Role and User ID are required" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(200).json({ status: false, message: "User not found" });

        // Prevent duplicate pending invitations for the same role
        const existingInvite = await Invitation.findOne({
            userId,
            role,
            status: "PENDING",
            expiryDate: { $gt: new Date() }
        });

        if (existingInvite) {
            return res.status(200).json({ status: false, message: `A pending invitation for ${role} already exists for this user` });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const invitation = new Invitation({
            token,
            role,
            userId,
            name: user.name,
            contact: user.email || user.mobile,
            commission: commission || 0,
            region,
            message,
            bdLeaderId,
            bdId,
            agencyId,
            senderId: req.admin._id,
            senderRole: req.admin.role,
            expiryDate: dayjs().add(expiryDays, 'day').toDate()
        });

        await invitation.save();

        // Create System Notification for User
        const notification = new Notification();
        notification.userId = user._id;
        notification.title = "Role Invitation";
        notification.message = `You have been invited to join Taka Live as a ${role.replace("_", " ")}. Click to review.`;
        notification.type = "ROLE_INVITATION";
        notification.itemId = invitation._id;
        notification.date = new Date().toISOString();
        await notification.save();

        // TODO: Trigger Push Notification (FCM) here if needed

        return res.status(200).json({
            status: true,
            message: "Invitation sent successfully",
            invitation
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
    }
};

exports.getInvitations = async (req, res) => {
    try {
        const invitations = await Invitation.find()
            .populate("userId", "name username image uniqueId")
            .populate("senderId", "name email")
            .sort({ createdAt: -1 });

        return res.status(200).json({ status: true, message: "Success", invitations });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.cancelInvitation = async (req, res) => {
    try {
        const invitation = await Invitation.findById(req.params.id);
        if (!invitation) return res.status(200).json({ status: false, message: "Invitation not found" });

        invitation.status = "CANCELLED";
        await invitation.save();

        return res.status(200).json({ status: true, message: "Invitation cancelled" });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

// This endpoint will be called by the Mobile App when user accepts/declines
exports.handleInvitation = async (req, res) => {
    try {
        const { invitationId, action } = req.body; // action: 'ACCEPT' or 'DECLINE'

        const invitation = await Invitation.findById(invitationId);
        if (!invitation) return res.status(200).json({ status: false, message: "Invitation not found" });

        if (invitation.status !== "PENDING" || dayjs().isAfter(dayjs(invitation.expiryDate))) {
            return res.status(200).json({ status: false, message: "Invitation is no longer valid" });
        }

        if (action === "ACCEPT") {
            invitation.status = "ACCEPTED";
            invitation.acceptedAt = new Date();
            await invitation.save();

            // Update User Role & Relationships
            const user = await User.findById(invitation.userId);
            if (user) {
                user.role = invitation.role;
                if (invitation.bdLeaderId) user.bdLeaderId = invitation.bdLeaderId;
                if (invitation.bdId) user.bdId = invitation.bdId;
                if (invitation.agencyId) user.agencyId = invitation.agencyId;
                if (invitation.commission) user.commission = invitation.commission;
                if (invitation.region) user.region = invitation.region;

                // Add Host/Agency specific flags
                if (invitation.role === "HOST") user.hostStatus = "ACTIVE";
                if (invitation.role === "AGENCY") user.agencyStatus = "ACTIVE";

                await user.save();
            }

            return res.status(200).json({ status: true, message: "Invitation accepted successfully" });
        } else {
            invitation.status = "REJECTED";
            await invitation.save();
            return res.status(200).json({ status: true, message: "Invitation declined" });
        }

    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
