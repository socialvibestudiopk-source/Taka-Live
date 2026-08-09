const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = require("../../util/multer");

const UserController = require("./user.controller");
const BDController = require("./bd.controller");
const AuthorityController = require("./authority.controller");
const upload = multer({
  storage,
});

const checkAccessWithKey = require("../../checkAccess");

// router.use(checkAccessWithKey());

// get user list
router.get("/getUsers", checkAccessWithKey(), UserController.index);
router.get("/getUserByUniqueId", checkAccessWithKey(), UserController.getByUniqueId);

// get popular user by followers
router.get(
  "/getPopularUser",
  checkAccessWithKey(),
  UserController.getPopularUser
);

// get profile of user who login
router.get("/user/profile", checkAccessWithKey(), UserController.getProfile);

// get random match for call
router.get("/user/random", checkAccessWithKey(), UserController.randomMatch);

// online the user
router.post("/user/online", UserController.userIsOnline);

// search user by name and username
router.post("/user/search", checkAccessWithKey(), UserController.search);

// global search
router.post("/user/global-search", checkAccessWithKey(), UserController.globalSearch);

// get user profile of post[feed]
router.post("/getUser", checkAccessWithKey(), UserController.getProfileUser);

//user login and signup
router.post("/loginSignup", checkAccessWithKey(), UserController.loginSignup);

// Taka ID Login
router.post("/takaLogin", checkAccessWithKey(), UserController.takaLogin);

// Security Update
router.post("/user/updateSecurity", checkAccessWithKey(), UserController.updateSecurity);

// check username is already exist or not
router.post(
  "/checkUsername",
  checkAccessWithKey(),
  UserController.checkUsername
);

// check referral code is valid and add referral bonus
router.post(
  "/addReferralCode",
  checkAccessWithKey(),
  UserController.referralCode
);

// admin add or less the rCoin or diamond of user through admin panel
router.post(
  "/user/addLessCoin",
  checkAccessWithKey(),
  UserController.addLessRcoinDiamond
);

// update user detail [android]
router.post(
  "/user/update",
  checkAccessWithKey(),
  upload.single("image"),
  UserController.updateProfile
);

// Advanced User Actions
router.patch("/user/forceLogout/:userId", checkAccessWithKey(), UserController.forceLogout);
router.patch("/user/changeId/:userId", checkAccessWithKey(), UserController.changeNumericId);
router.post("/user/grantAsset", checkAccessWithKey(), UserController.grantAsset);
router.post("/user/removeAsset", checkAccessWithKey(), UserController.removeAsset);

// bock unblock user
router.patch(
  "/blockUnblock/:userId",
  checkAccessWithKey(),
  UserController.blockUnblock
);

// update user role
router.patch(
  "/user/updateRole/:userId",
  checkAccessWithKey(),
  UserController.updateRole
);

// Authority & Navigation
router.get("/user/authorized-modules/:userId", checkAccessWithKey(), AuthorityController.getAuthorizedModules);

// BD Center APIs
router.get("/bd/dashboard", checkAccessWithKey(), BDController.getDashboard);
router.get("/bd/search-user", checkAccessWithKey(), BDController.searchUser);
router.post("/bd/invite-agency", checkAccessWithKey(), BDController.sendAgencyInvitation);
router.post("/bd/invite-bd", checkAccessWithKey(), BDController.sendBDInvitation);
router.get("/bd/my-bds", checkAccessWithKey(), BDController.getMyBDs);
router.post("/bd/accept-invitation", checkAccessWithKey(), BDController.acceptBDInvitation);

// router.patch("/IdGenerate", checkAccessWithKey(), UserController.IdGenerate);

module.exports = router;
