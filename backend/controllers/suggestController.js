require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const axios = require("axios");

exports.suggestNextWord = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") return res.json({ suggest: "" });

  try {
    const openaiRes = await axios.post(
      "https://api.openai.com/v1/completions",
      {
        model: "gpt-3.5-turbo-instruct",
        prompt: prompt,
        max_tokens: 3,      // chỉ lấy 3 từ tiếp theo
        temperature: 0.7,
        logprobs: 5,         // lấy top 5 từ (nếu cần)
        stop: null,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const text = openaiRes.data.choices[0].text.trim();
    // Nếu muốn lấy top từ gợi ý: openaiRes.data.choices[0].logprobs.top_logprobs[0]

    res.json({ suggest: text });
  } catch (err) {
    console.error(err.response?.data || err);
    res.json({ suggest: "" });
  }
};
