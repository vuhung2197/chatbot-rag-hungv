const express = require('express');
const router = express.Router();
const {
  saveWord, userWords, approveWord, deleteUserWord
} = require('../controllers/dictionaryController');

router.post('/save-word', saveWord);
router.get('/user-words', userWords);
router.post('/approve-word', approveWord);
router.post('/delete-user-word', deleteUserWord);

module.exports = router;
