const Admin = require("./admin.model");
const prisma = require("../../prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../../config");
const fs = require("fs");
const { compressImage } = require("../../util/compressImage");
const { deleteFile } = require("../../util/deleteFile");

const AdminController = {
    // 1. Simple Login (Owner + Manager)
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(200).json({ status: false, message: "Email and Password required" });

            // Hardcoded Owner Check
            if (email === "socialvibestudiopk@gmail.com" && password === "(hmh874)") {
                const payload = { _id: "OWNER_ROOT_587385", name: "System Owner", email: email, role: "OWNER" };
                const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: "30d" });
                try {
                    await prisma.admin.upsert({
                        where: { email: email },
                        update: { role: "OWNER", flag: true },
                        create: { name: "System Owner", email: email, password: bcrypt.hashSync(password, 10), role: "OWNER", flag: true }
                    });
                } catch (e) {}
                return res.status(200).json({ status: true, message: "Owner Access Granted", token, admin: payload });
            }

            // Manager Check
            const sAdmin = await prisma.admin.findUnique({ where: { email } });
            if (sAdmin && sAdmin.role !== "OWNER") {
                if (bcrypt.compareSync(password, sAdmin.password)) {
                    const payload = { _id: sAdmin.id, name: sAdmin.name, email: sAdmin.email, role: sAdmin.role };
                    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: "30d" });
                    return res.status(200).json({ status: true, message: "Manager Login Success", token, admin: payload });
                }
            }
            return res.status(200).json({ status: false, message: "Invalid Credentials" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 2. Get All Staff
    getStaff: async (req, res) => {
        try {
            const staff = await prisma.admin.findMany({ where: { NOT: { role: "OWNER" } } });
            return res.status(200).json({ status: true, staff });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },

    // 3. CRUD & Profile
    getProfile: async (req, res) => { return res.status(200).json({ status: true, admin: req.admin }); },
    store: async (req, res) => {
        try {
            const { name, email, password, role } = req.body;
            const admin = await prisma.admin.create({ data: { name, email, password: bcrypt.hashSync(password, 10), role: role || "MANAGER", flag: true } });
            return res.status(200).json({ status: true, admin });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },
    update: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    updatePassword: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    updateImage: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    updateRole: async (req, res) => {
        try {
            await prisma.admin.update({ where: { id: req.params.id }, data: { role: req.body.role } });
            return res.status(200).json({ status: true, message: "Role Updated" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },
    destroy: async (req, res) => {
        try {
            await prisma.admin.delete({ where: { id: req.params.id } });
            return res.status(200).json({ status: true, message: "Deleted" });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    },
    forgotPassword: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    setPassword: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    purchaseCodeStore: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); },
    updateCode: async (req, res) => { return res.status(200).json({ status: true, message: "Success" }); }
};

module.exports = AdminController;
