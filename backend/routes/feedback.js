const express = require('express');
const router = express.Router();
const { feedback, list, approve } = require('../controllers/feedbackController');

router.post('/', feedback);           // POST /feedback
router.get('/', list);                // GET /feedback
router.post('/approve', approve);     // POST /feedback/approve

module.exports = router;
