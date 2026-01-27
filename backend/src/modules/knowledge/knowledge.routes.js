import express from 'express';
import {
    addKnowledge,
    getAllKnowledge,
    updateKnowledge,
    deleteKnowledge,
    getKnowledgeById,
    getChunksByKnowledgeId,
} from './knowledge.controller.js';

const router = express.Router();
import { verifyToken, requireAdmin } from '../../shared/middlewares/auth.middleware.js';

router.use(verifyToken, requireAdmin);

router.post('/', addKnowledge);
router.get('/', getAllKnowledge);
router.put('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);
router.get('/:id', getKnowledgeById);
router.get('/:id/chunks', getChunksByKnowledgeId);

export default router;
