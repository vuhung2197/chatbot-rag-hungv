const express = require('express');
const router = express.Router();
const {
  saveHighlight, getHighlights, highlightsRoutes, deleteHighlight
} = require('../controllers/highlightsController');

router.post('/save', saveHighlight);
router.get('/', getHighlights);
router.post('/approve', highlightsRoutes);
router.post('/delete', deleteHighlight);

module.exports = router;
