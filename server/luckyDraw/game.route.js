const express = require("express");
const router = express.Router();
const GameController = require("./game.controller");
const { isOwner } = require("../middleware/authority.middleware");

router.get("/stats", isOwner, GameController.getGameStats);
router.post("/toggle", isOwner, GameController.toggleGame);

module.exports = router;
