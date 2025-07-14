import express from 'express';
import {
  addKnowledge,
  getAllKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getKnowledgeById,
  getChunksByKnowledgeId
} from '../controllers/knowledgeController.js';

const router = express.Router();

router.post('/', addKnowledge);
router.get('/', getAllKnowledge);
router.put('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);
router.get('/:id', getKnowledgeById);
router.get('/:id/chunks', getChunksByKnowledgeId);

export default router;
