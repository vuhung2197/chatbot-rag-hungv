const express = require('express');
const router = express.Router();
const { chat, history, suggest, deleteHistoryItem } = require('../controllers/chatController');
const { verifyToken } = require("../middlewares/authMiddleware");

router.post('/', verifyToken, chat);
router.get('/history', verifyToken, history);
router.delete('/history/:id', verifyToken, deleteHistoryItem);
router.get('/suggest', suggest);

module.exports = router;
