const Agency = require("./agency.model");
const User = require("../user/user.model");
const prisma = require("../../prisma");

// Helper to handle BigInt serialization in JSON
const serialize = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

exports.index = async (req, res) => {
  try {
    // 1. Try Prisma (Supabase)
    const agencies = await prisma.agency.findMany({
        where: { is_deleted: false },
        include: {
            owner: { select: { name: true, username: true, unique_id: true, image: true } },
            bd: { select: { name: true, unique_id: true } }
        },
        orderBy: { created_at: 'desc' }
    });

    if (agencies && agencies.length > 0) {
       return res.status(200).json({ status: true, message: "Success (Prisma)", agencies: serialize(agencies) });
    }

    // 2. Fallback to MongoDB
    const mongoAgencies = await Agency.find({ isDeleted: false })
      .populate("ownerId", "name username uniqueId image")
      .populate("bdId", "name uniqueId")
      .sort({ createdAt: -1 });

    return res.status(200).json({ status: true, message: "Success (Legacy)", agencies: mongoAgencies });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.updateAgencyStatus = async (req, res) => {
    try {
        const agencyId = req.params.id;

        // Try Prisma first
        try {
            const sAgency = await prisma.agency.findUnique({ where: { id: agencyId } });
            if (sAgency) {
                const newStatus = req.body.status !== undefined ? req.body.status : !sAgency.status;
                const updated = await prisma.agency.update({
                    where: { id: agencyId },
                    data: { status: newStatus }
                });
                return res.status(200).json({ status: true, message: "Agency status updated (Prisma)", agency: serialize(updated) });
            }
        } catch (e) { console.warn("Prisma Error:", e.message); }

        const agency = await Agency.findById(agencyId);
        if (!agency) return res.status(200).json({ status: false, message: "Agency not found" });

        agency.status = req.body.status !== undefined ? req.body.status : !agency.status;
        await agency.save();

        return res.status(200).json({ status: true, message: "Agency status updated (Legacy)", agency });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};

exports.assignBD = async (req, res) => {
    try {
        const { bdId } = req.body;
        const agencyId = req.params.id;

        // Try Prisma
        try {
            const sAgency = await prisma.agency.findUnique({ where: { id: agencyId } });
            if (sAgency) {
                const updated = await prisma.agency.update({
                    where: { id: agencyId },
                    data: { bd_id: bdId }
                });
                return res.status(200).json({ status: true, message: "BD assigned (Prisma)", agency: serialize(updated) });
            }
        } catch (e) { console.warn("Prisma Error:", e.message); }

        const agency = await Agency.findById(agencyId);
        if (!agency) return res.status(200).json({ status: false, message: "Agency not found" });

        agency.bdId = bdId;
        await agency.save();

        return res.status(200).json({ status: true, message: "BD assigned to agency successfully (Legacy)", agency });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
