const express = require('express');
const router = express.Router();
const {
  addKnowledge,
  getAllKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getKnowledgeById
} = require('../controllers/knowledgeController');

router.post('/', addKnowledge);
router.get('/', getAllKnowledge);
router.put('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);
router.get('/:id', getKnowledgeById);

module.exports = router;
