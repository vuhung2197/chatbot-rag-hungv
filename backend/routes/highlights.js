const express = require('express');
const router = express.Router();
const {
  saveHighlight, getHighlights, highlightsRoutes
} = require('../controllers/highlightsController');

router.post('/save', saveHighlight);
router.get('/', getHighlights);
router.post('/approve', highlightsRoutes);

module.exports = router;
