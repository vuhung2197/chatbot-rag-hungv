import '../bootstrap/env.js';
import axios from "axios";

/**
 * Gợi ý từ tiếp theo cho người dùng dựa trên prompt đã nhập.
 * Nhận prompt (câu hỏi hoặc đoạn văn bản) từ request body,
 * trả về từ/cụm từ tiếp theo mà AI dự đoán phù hợp.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function suggestNextWord(req, res) {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") return res.json({ suggest: "" });

  try {
    const openaiRes = await axios.post(
      "https://api.openai.com/v1/completions",
      {
        model: "gpt-3.5-turbo-instruct",
        prompt: prompt,
        max_tokens: 3,
        temperature: 0.7,
        logprobs: 5,
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
