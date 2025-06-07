const express = require('express');
const router = express.Router();
const {
  addKnowledge,
  getAllKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getKnowledgeById,
  getChunksByKnowledgeId
} = require('../controllers/knowledgeController');

router.post('/', addKnowledge);
router.get('/', getAllKnowledge);
router.put('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);
router.get('/:id', getKnowledgeById);
router.get("/:id/chunks", getChunksByKnowledgeId);

module.exports = router;
