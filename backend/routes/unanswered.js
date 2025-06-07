const express = require("express");
const router = express.Router();
const { getUnansweredQuestions, deleteUnanswered, getChunksByKnowledgeId } = require("../controllers/unansweredController");

router.get("/", getUnansweredQuestions);
router.delete("/:id", deleteUnanswered);

module.exports = router;