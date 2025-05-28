const express = require('express');
const router = express.Router();
const {
  saveHighlight, getHighlights
} = require('../controllers/highlightsController');

router.post('/save', saveHighlight);
router.get('/', getHighlights);

module.exports = router;
