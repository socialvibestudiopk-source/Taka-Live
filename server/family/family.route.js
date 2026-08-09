const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = require("../../util/multer");
const upload = multer({ storage });

const FamilyController = require("./family.controller");
const checkAccessWithKey = require("../../checkAccess");

router.get("/all", checkAccessWithKey(), FamilyController.index);
router.post("/create", checkAccessWithKey(), upload.single("image"), FamilyController.store);
router.post("/join", checkAccessWithKey(), FamilyController.join);
router.post("/leave", checkAccessWithKey(), FamilyController.leave);

module.exports = router;
