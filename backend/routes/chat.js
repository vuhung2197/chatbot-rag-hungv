const express = require('express');
const router = express.Router();
const { chat, history, suggest } = require('../controllers/chatController');
const { verifyToken } = require("../middlewares/authMiddleware");

router.post('/', verifyToken, chat);          // POST /chat
router.get('/history', history); // GET /chat/history
router.get('/suggest', suggest); // GET /chat/suggest?query=...

module.exports = router;
