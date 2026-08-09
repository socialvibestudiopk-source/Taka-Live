const express = require("express");
const router = express.Router();

const LiveUserController = require("./liveUser.controller");

const checkAccessWithKey = require("../../checkAccess");

// get live user list
router.get("/liveUser", checkAccessWithKey(), LiveUserController.getLiveUser);

// live the user
router.post("/user/live", checkAccessWithKey(), LiveUserController.userIsLive);

// check if user is live
router.get("/checkLive", checkAccessWithKey(), LiveUserController.checkLive);

// terminate live session
router.delete("/terminateAudioSession", checkAccessWithKey(), LiveUserController.terminateAudioSession);

//generate Agora token
router.post(
  "/generateAgoraToken",
  checkAccessWithKey(),
  LiveUserController.generateToken
);

module.exports = router;
