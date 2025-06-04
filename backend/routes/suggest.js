const express = require("express");
const router = express.Router();
const { suggestNextWord } = require("../controllers/suggestController");

router.post("/", suggestNextWord);

module.exports = router;