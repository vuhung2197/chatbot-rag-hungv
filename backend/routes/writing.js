const express = require('express');
const router = express.Router();
const { submitWriting, getUserWritingHistory } = require('../controllers/writingController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/submit', verifyToken, submitWriting);
router.get('/history', verifyToken, getUserWritingHistory);

module.exports = router;