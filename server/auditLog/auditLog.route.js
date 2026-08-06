const express = require("express");
const router = express.Router();
const AuditLogController = require("./auditLog.controller");
const AdminMiddleware = require("../middleware/admin.middleware");

router.get("/", AdminMiddleware, AuditLogController.index);

module.exports = router;
