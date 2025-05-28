const express = require('express');
const router = express.Router();
const { chat, history, suggest } = require('../controllers/chatController');

router.post('/', chat);          // POST /chat
router.get('/history', history); // GET /chat/history
router.get('/suggest', suggest); // GET /chat/suggest?query=...

module.exports = router;
