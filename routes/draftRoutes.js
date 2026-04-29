const router = require("express").Router();
const draftController = require("../controllers/draftController");
const authUserMiddleware = require("../middlewares/authmiddleware");
const upload = require("../middlewares/upload");
 
// GET    /api/draft/           → get all drafts for logged-in user
// POST   /api/draft/save       → save (or update) a draft  [accepts media upload]
// DELETE /api/draft/:id        → delete a draft
// POST   /api/draft/:id/publish → publish draft as a real post
 
router.get("/", authUserMiddleware, draftController.getDrafts);
router.post("/save", authUserMiddleware, upload, draftController.saveDraft);
router.delete("/:id", authUserMiddleware, draftController.deleteDraft);
router.post("/:id/publish", authUserMiddleware, draftController.publishDraft);
 
module.exports = router;
 