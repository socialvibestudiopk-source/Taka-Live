const User = require("../user/user.model");
const Agency = require("../agency/agency.model");
const AgencyApplication = require("./agencyApplication.model");
const SalaryPolicy = require("./salaryPolicy.model");
const TargetPolicy = require("./targetPolicy.model");

// Unified Center Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;
    const stats = {};

    if (user.role === "host") {
        stats.role = "host";
        stats.agency = await Agency.findById(user.agencyId).select("name image ownerId whatsappNumber status");
        stats.joinedAt = user.joinedAt;
        stats.hostStatus = user.hostStatus;
        // Fetch target/work details logic here...
    } else if (user.role === "agency") {
        stats.role = "agency";
        const agency = await Agency.findOne({ ownerId: user._id });
        if (agency) {
            stats.agency = agency;
            stats.totalHosts = await User.countDocuments({ agencyId: agency._id, role: "host" });
            stats.pendingApps = await AgencyApplication.countDocuments({ agencyId: agency._id, status: "PENDING" });
        }
    }

    return res.status(200).json({ status: true, stats });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Host: Search Agency by Code
exports.searchAgency = async (req, res) => {
    try {
        const { code } = req.query;
        const agency = await Agency.findOne({ code, status: true })
            .populate("ownerId", "name image");

        if (!agency) return res.status(200).json({ status: false, message: "Agency not found" });

        return res.status(200).json({ status: true, agency });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Host: Search and Apply to Agency
exports.applyToAgency = async (req, res) => {
    try {
        const { agencyId } = req.body; // Using the numeric/code ID
        const agency = await Agency.findOne({ code: agencyId, status: true });
        if (!agency) return res.status(200).json({ status: false, message: "Agency not found or inactive" });

        const user = req.user;
        if (user.agencyId) return res.status(200).json({ status: false, message: "You already belong to an agency" });

        const existingApp = await AgencyApplication.findOne({ hostId: user._id, agencyId: agency._id, status: "PENDING" });
        if (existingApp) return res.status(200).json({ status: false, message: "Application already pending" });

        const app = new AgencyApplication({
            hostId: user._id,
            agencyId: agency._id
        });
        await app.save();

        return res.status(200).json({ status: true, message: "Application sent successfully!" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Agency: Invite User to become Host
exports.inviteHost = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const agency = await Agency.findOne({ ownerId: req.user._id });
        if (!agency) return res.status(200).json({ status: false, message: "Agency not found" });

        const user = await User.findById(targetUserId);
        if (user.agencyId) return res.status(200).json({ status: false, message: "User already belongs to an agency" });

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 3);

        const invitation = new AgencyInvitation({
            agencyId: agency._id,
            agencyOwnerId: req.user._id,
            userId: targetUserId,
            role: "HOST",
            expiresAt: expiry
        });
        await invitation.save();

        return res.status(200).json({ status: true, message: "Host invitation sent successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Agency: Accept/Decline Application
exports.reviewApplication = async (req, res) => {
    try {
        const { appId, action, reason } = req.body; // action: 'APPROVED' or 'DECLINED'
        const application = await AgencyApplication.findById(appId);
        if (!application || application.status !== "PENDING") return res.status(200).json({ status: false, message: "Invalid application" });

        const agency = await Agency.findById(application.agencyId);
        if (agency.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ status: false, message: "Unauthorized" });

        application.status = action;
        application.declineReason = reason;
        application.reviewedAt = new Date();
        application.reviewedBy = req.user._id;
        await application.save();

        if (action === "APPROVED") {
            const host = await User.findById(application.hostId);
            host.role = "host";
            host.agencyId = agency._id;
            host.hostStatus = "ACTIVE";
            await host.save();

            agency.hostCount += 1;
            await agency.save();
        }

        return res.status(200).json({ status: true, message: `Application ${action.toLowerCase()} successfully` });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Fetch policies for host
exports.getPolicies = async (req, res) => {
    try {
        const agencyId = req.user.agencyId;
        if (!agencyId) return res.status(200).json({ status: false, message: "No agency associated" });

        const salaryPolicy = await SalaryPolicy.findOne({ agencyId, status: true }).sort({ createdAt: -1 });
        const targetPolicy = await TargetPolicy.findOne({ agencyId, status: true }).sort({ createdAt: -1 });

        return res.status(200).json({ status: true, salaryPolicy, targetPolicy });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
