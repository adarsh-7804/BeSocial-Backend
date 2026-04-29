const router = require("express").Router();

const notInterestedController = require("../controllers/notInterestedController");
const authUserMiddlewar = require("../middlewares/authmiddleware");

router.post("/:postId" , authUserMiddlewar, notInterestedController.markNotInterested) 
router.delete("/:postId" , authUserMiddlewar, notInterestedController.undoNotInterested) 

module.exports = router ;