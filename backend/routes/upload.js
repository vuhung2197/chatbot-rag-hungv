const express = require("express");
const multer = require("multer");
const router = express.Router();
const upload = multer({ dest: "uploads/" });
const { uploadAndTrain } = require("../controllers/uploadController");

// POST /upload
router.post("/", upload.single("file"), uploadAndTrain);

module.exports = router;