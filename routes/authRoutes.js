  const profileUpload = require("../middlewares/profileUpload");
  const {
    registerUser,
    loginUser,
    logoutUser,
    resetPassword,
    validateResetOtp,
    sendVerifyOtp,
    verifyEmial,
    isAuthenticated,
    verifyLoginOtp,
    checkEmail,
    refreshAccessToken,
    deleteUser,
    deactivateUser,
    activateUser,
    requestReactivation,
    getProfile,
    updateProfile,
    getUserById,
    sendInvite 
  } = require("../controllers/authController");

  const {
    freindRequestSent,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    // followUser,
    // unfollowUser,
    unfriendUser,
    getMutualConnection,
    suggestedUser
  } = require("../controllers/freindRequestController")

  const { searchUser }  = require("../controllers/searchController")


  // const multer = require("multer");
  // const path = require("path");

  // const upload = multer({
  //   dest: "uploads/",
  // });

  const router = require("express").Router();
  // const authController = require('../controllers/authController');
  const authUserMiddlewar = require("../middlewares/authmiddleware");

  // User API
  router.post("/user/register", registerUser);
  router.post("/user/login", loginUser);
  router.post("/user/logout", logoutUser);
  router.post("/user/refresh-token", refreshAccessToken);
  router.delete("/user/delete", authUserMiddlewar, deleteUser);
  router.patch("/user/deactivate", authUserMiddlewar, deactivateUser);
  router.post("/user/reactivation request", requestReactivation);
  router.patch("/user/activate", activateUser);

  router.get("/user/profile", authUserMiddlewar, getProfile);

  router.post("/user/send-verify-otp", authUserMiddlewar, sendVerifyOtp);
  router.post("/user/verify-email", authUserMiddlewar, verifyEmial);

  // router.put(
  //   "/user/update-profile-data",
  //   authUserMiddlewar,
  //   upload.fields([ 
  //     { name: "avatar", maxCount: 1 },
  //     { name: "coverImage", maxCount: 1 },
  //   ]),
  //   updateProfile,
  // );

  router.put(
    "/user/update-profile-data",
    authUserMiddlewar,
    profileUpload,
    updateProfile,
  );

  // ALL FREIND REQUEST API END-POINT

  router.post("/user/friend-request/:id", authUserMiddlewar, freindRequestSent)
  router.post("/user/accept-request/:id", authUserMiddlewar,acceptFriendRequest)
  router.post("/user/reject-request/:id", authUserMiddlewar,rejectFriendRequest)
  router.post("/user/unfriend/:id", authUserMiddlewar,unfriendUser)
  router.get("/user/mutual/:id" , authUserMiddlewar, getMutualConnection)
  router.get("/user/suggestion", authUserMiddlewar, suggestedUser)
  router.post("/user/cancel-request/:id", authUserMiddlewar, cancelFriendRequest);

  // Getting User 
  router.get("/user/search",  searchUser)
  router.get("/user/:id", authUserMiddlewar, getUserById);

  // refer a friend

  router.post("/user/invite", authUserMiddlewar, sendInvite);

  //authUserMiddlewar,

  // console.log("Auth routes loaded");

  // Validation
  router.post("/user/check-email", checkEmail);
  router.post("/user/verify-login-otp", verifyLoginOtp);
  router.post("/user/send-otp", sendVerifyOtp);
  router.post("/user/verify-account", verifyEmial);
  router.post("/user/validate-reset-otp", validateResetOtp);
  router.post("/user/is-auth", isAuthenticated);


  router.post("/user/reset-pass", resetPassword);

  // router.post('/user/forgot-password/:token', authController.forgetPass)

  module.exports = router;
