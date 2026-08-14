const Admin = require("./admin.model");
const supabase = require("../../supabase");
const prisma = require("../../prisma");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { deleteFile } = require("../../util/deleteFile");
const jwt = require("jsonwebtoken");
const config = require("../../config");
const nodemailer = require("nodemailer");
const Login = require("../login/login.model");

const { compressImage } = require("../../util/compressImage");

// without PurchaseCode
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(200).json({ status: false, message: "Invalid details!" });

    // 1. Try Supabase Auth First
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (!authError && authData.user) {
        // Find Admin via PRISMA (Supabase SQL) - Mongo se azadi!
        try {
            const sAdmin = await prisma.admin.findFirst({
                where: { OR: [{ email: email }, { supabase_id: authData.user.id }] }
            });

            if (sAdmin) {
                 const payload = {
                    _id: sAdmin.id,
                    name: sAdmin.name,
                    email: sAdmin.email,
                    role: sAdmin.role,
                    supabaseId: authData.user.id
                 };
                 const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: "24h" });
                 return res.status(200).json({
                    status: true,
                    message: "Success (Supabase Auth)!!",
                    token,
                    admin: payload
                 });
            }
        } catch (e) { console.warn("Prisma Admin Lookup Error:", e.message); }
    }

    // 2. Legacy MongoDB Fallback (Only if Mongo is connected)
    const mongoose = require("mongoose");
    if (mongoose.connection.readyState === 1) {
        const admin = await Admin.findOne({ email: email });
        if (admin) {
            const isPassword = bcrypt.compareSync(password, admin.password);
            if (isPassword) {
                const payload = { _id: admin._id.toString(), name: admin.name, email: admin.email, role: admin.role };
                const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: "24h" });
                return res.status(200).json({ status: true, message: "Success (Legacy Auth)!!", token, admin: payload });
            }
        }
    }

    // 3. FINAL BYPASS for Owners (If configured in .env)
    if (email === process.env.OWNER_EMAIL && password === process.env.OWNER_BOOTSTRAP_PASSWORD) {
        const payload = { _id: "SYSTEM_OWNER", name: "Owner", email: email, role: "OWNER" };
        const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: "24h" });
        return res.status(200).json({ status: true, message: "Emergency Login Success!!", token, admin: payload });
    }

    return res.status(200).json({ status: false, message: "Invalid Credentials or Database Disconnected" });

  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    return res.status(500).json({ status: false, error: error.message });
  }
};

// ... Rest of the file remains same, adding Prisma select logic to getStaff ...

exports.getStaff = async (req, res) => {
  try {
    const sStaff = await prisma.admin.findMany({
        select: { id: true, name: true, email: true, role: true, image: true, created_at: true }
    });
    return res.status(200).json({ status: true, message: "Success", staff: sStaff });
  } catch (e) {
    const staff = await Admin.find().select("-password -purchaseCode");
    return res.status(200).json({ status: true, message: "Success (Legacy)", staff });
  }
};

// ... [Existing CRUD methods with Hybrid logic] ...
exports.store = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const sAdmin = await prisma.admin.create({
            data: { name, email, password: bcrypt.hashSync(password, 10), role: "ADMIN" }
        });
        return res.status(200).json({ status: true, message: "Admin Stored in Supabase", admin: sAdmin });
    } catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const updated = await prisma.admin.update({
            where: { id: req.params.id },
            data: { role: req.body.role }
        });
        return res.status(200).json({ status: true, message: "Role Updated", staff: updated });
    } catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
};

exports.destroy = async (req, res) => {
    try {
        await prisma.admin.delete({ where: { id: req.params.id } });
        return res.status(200).json({ status: true, message: "Deleted" });
    } catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
};
