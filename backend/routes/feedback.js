const express = require('express');
const router = express.Router();
const { feedback, list, approve } = require('../controllers/feedbackController');

router.post('/', feedback);
router.get('/', list);
router.post('/approve', approve);

module.exports = router;
