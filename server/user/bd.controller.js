const User = require("./user.model");
const Agency = require("../agency/agency.model");
const AgencyInvitation = require("../invitation/agencyInvitation.model");
const BDInvitation = require("../invitation/bdInvitation.model");
const Wallet = require("../wallet/wallet.model");
const prisma = require("../../prisma");

// Helper to handle BigInt serialization in JSON
const serialize = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

// Unified BD Center Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;
    const stats = {};

    // --- PRISMA (SUPABASE) ---
    try {
        const sUser = await prisma.user.findUnique({ where: { id: user.id || user._id.toString() } });
        if (sUser) {
            if (sUser.role === "bd" || sUser.role === "bd_leader") {
                stats.totalAgencies = await prisma.agency.count({ where: { bd_id: sUser.id } });
                stats.activeAgencies = await prisma.agency.count({ where: { bd_id: sUser.id, status: true } });
                stats.pendingAgencyInvites = await prisma.agencyInvitation.count({ where: { bd_id: sUser.id, status: "PENDING" } });
                stats.totalWork = 0;
                stats.commission = sUser.commission || 0;
            }

            if (sUser.role === "bd_leader") {
                stats.totalBDs = await prisma.user.count({ where: { bd_leader_id: sUser.id, role: "bd" } });
                stats.activeBDs = await prisma.user.count({ where: { bd_leader_id: sUser.id, role: "bd", is_block: false } });
                stats.pendingBDInvites = await prisma.bDInvitation.count({ where: { leader_id: sUser.id, status: "PENDING" } });

                const bds = await prisma.user.findMany({ where: { bd_leader_id: sUser.id }, select: { id: true } });
                const bdIds = bds.map(b => b.id);
                stats.teamAgencies = await prisma.agency.count({ where: { bd_id: { in: bdIds } } });
                stats.teamWork = 0;
            }
            return res.status(200).json({ status: true, stats: serialize(stats), role: sUser.role, source: "Prisma" });
        }
    } catch (e) { console.warn("Prisma Dashboard Error:", e.message); }

    // --- MONGO FALLBACK ---
    if (user.role === "bd" || user.role === "bd_leader") {
        // BD specific stats
        stats.totalAgencies = await Agency.countDocuments({ bdId: user._id });
        stats.activeAgencies = await Agency.countDocuments({ bdId: user._id, status: true });
        stats.pendingAgencyInvites = await AgencyInvitation.countDocuments({ bdId: user._id, status: "PENDING" });
        stats.totalWork = 0; // authoritative calculation
        stats.commission = user.commission || 0;
    }

    if (user.role === "bd_leader") {
        // BD Leader specific stats
        stats.totalBDs = await User.countDocuments({ bdLeaderId: user._id, role: "bd" });
        stats.activeBDs = await User.countDocuments({ bdLeaderId: user._id, role: "bd", isBlock: false });
        stats.pendingBDInvites = await BDInvitation.countDocuments({ leaderId: user._id, status: "PENDING" });

        // Team level stats
        const bdIds = await User.find({ bdLeaderId: user._id }).distinct("_id");
        stats.teamAgencies = await Agency.countDocuments({ bdId: { $in: bdIds } });
        stats.teamWork = 0;
    }

    return res.status(200).json({ status: true, stats, role: user.role, source: "Legacy" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Search User for BD or Agency Invite
exports.searchUser = async (req, res) => {
  try {
    const { uniqueId, type } = req.query; // type: 'bd' or 'agency'

    // Try Prisma
    const sUser = await prisma.user.findUnique({
        where: { unique_id: BigInt(uniqueId) },
        select: { name: true, username: true, image: true, unique_id: true, role: true, is_block: true, bd_id: true, bd_leader_id: true }
    });

    if (sUser) {
        if (sUser.is_block) return res.status(200).json({ status: false, message: "User is banned" });
        if (type === 'agency' && sUser.role === "agency") return res.status(200).json({ status: false, message: "User is already an Agency" });
        if (type === 'bd' && (sUser.role === "bd" || sUser.role === "bd_leader")) return res.status(200).json({ status: false, message: "User is already a BD/Leader" });

        return res.status(200).json({ status: true, user: serialize(sUser) });
    }

    const user = await User.findOne({ uniqueId: parseInt(uniqueId) })
        .select("name username image uniqueId role isBlock bdId bdLeaderId");

    if (!user) return res.status(200).json({ status: false, message: "User not found" });

    // Eligibility Checks
    if (user.isBlock) return res.status(200).json({ status: false, message: "User is banned" });

    if (type === 'agency') {
        if (user.role === "agency") return res.status(200).json({ status: false, message: "User is already an Agency" });
    } else if (type === 'bd') {
        if (user.role === "bd" || user.role === "bd_leader") return res.status(200).json({ status: false, message: "User is already a BD/Leader" });
    }

    return res.status(200).json({ status: true, user });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Send BD Invitation (BD Leader only)
exports.sendBDInvitation = async (req, res) => {
  try {
    if (req.user.role !== "bd_leader" && req.user.role !== "OWNER") {
        return res.status(403).json({ status: false, message: "Only BD Leaders can invite BDs" });
    }
    const { targetUserId } = req.body;
    const leaderId = req.user.id || req.user._id.toString();

    // Try Prisma
    try {
        const existing = await prisma.bDInvitation.findFirst({
            where: { leader_id: leaderId, target_user_id: targetUserId, status: "PENDING" }
        });
        if (existing) return res.status(200).json({ status: false, message: "Invitation already pending (Prisma)" });

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 3);

        await prisma.bDInvitation.create({
            data: {
                leader_id: leaderId,
                target_user_id: targetUserId,
                expires_at: expiry
            }
        });
        return res.status(200).json({ status: true, message: "BD Invitation sent successfully (Prisma)" });
    } catch (e) { console.warn("Prisma BD Invite Error:", e.message); }

    // Legacy Fallback
    const existing = await BDInvitation.findOne({ leaderId, targetUserId, status: "PENDING" });
    if (existing) return res.status(200).json({ status: false, message: "Invitation already pending" });

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 3);

    const invitation = new BDInvitation({
      leaderId,
      targetUserId,
      expiresAt: expiry
    });

    await invitation.save();
    return res.status(200).json({ status: true, message: "BD Invitation sent successfully" });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// Send Agency Invitation
exports.sendAgencyInvitation = async (req, res) => {
    try {
      const { targetUserId } = req.body;
      const bdId = req.user._id;

      const existing = await AgencyInvitation.findOne({ bdId, targetUserId, status: "PENDING" });
      if (existing) return res.status(200).json({ status: false, message: "Invitation already pending" });

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 3);

      const invitation = new AgencyInvitation({
        bdId,
        targetUserId,
        expiresAt: expiry
      });

      await invitation.save();
      return res.status(200).json({ status: true, message: "Agency Invitation sent successfully" });
    } catch (error) {
      return res.status(500).json({ status: false, error: error.message });
    }
};

// Accept BD Invitation
exports.acceptBDInvitation = async (req, res) => {
    try {
        const { invitationId } = req.body;
        const invitation = await BDInvitation.findById(invitationId);
        if (!invitation || invitation.status !== "PENDING") return res.status(200).json({ status: false, message: "Invalid or expired invitation" });

        const user = await User.findById(invitation.targetUserId);
        user.role = "bd";
        user.bdLeaderId = invitation.leaderId;
        await user.save();

        invitation.status = "ACCEPTED";
        invitation.acceptedAt = new Date();
        await invitation.save();

        return res.status(200).json({ status: true, message: "You are now a Business Developer!" });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

// Get My BDs (for Leader)
exports.getMyBDs = async (req, res) => {
    try {
        const bds = await User.find({ bdLeaderId: req.user._id, role: "bd" })
            .select("name username image uniqueId lastLogin isBlock createdAt");
        return res.status(200).json({ status: true, bds });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
