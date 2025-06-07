const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

require('dotenv').config();

// Import routes
app.use('/chat', require('./routes/chat'));
app.use('/feedback', require('./routes/feedback'));
app.use('/dictionary', require('./routes/dictionary'));
app.use('/highlights', require('./routes/highlights'));
app.use('/knowledge', require('./routes/knowledge'));
app.use("/suggest-next-word", require("./routes/suggest"));
app.use("/unanswered", require("./routes/unanswered"));
app.use("/upload", require("./routes/upload"));

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
