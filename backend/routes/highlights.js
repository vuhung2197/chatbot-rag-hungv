import express from "express";
import { saveHighlight, getHighlights, highlightsRoutes, deleteHighlight } from "../controllers/highlightsController.js";

const router = express.Router();

router.post('/save', saveHighlight);
router.get('/', getHighlights);
router.post('/approve', highlightsRoutes);
router.post('/delete', deleteHighlight);

export default router;
