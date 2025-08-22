import '../bootstrap/env.js'; // Đảm bảo biến môi trường được nạp
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Tạo prompt Chain-of-Thought
 */
function generatePromptCoT(userQuestion, contextChunks) {
  const contextText = contextChunks
    .map((chunk, i) => `Đoạn ${i + 1}:\n${chunk}`)
    .join('\n\n');

  return `
  Bạn là một trợ lý AI thông minh.

  Dưới đây là các đoạn thông tin truy xuất từ hệ thống kiến thức:

  ${contextText}

  Câu hỏi của người dùng: "${userQuestion}"

  Hãy suy luận từng bước dựa trên các đoạn trên. 
  Đừng trả lời ngay. Thay vào đó:
  - Phân tích từng đoạn liên quan
  - Kết nối các thông tin cần thiết
  - Chỉ sau khi suy luận xong, hãy đưa ra câu trả lời cuối cùng

  Đáp án:
  `;
}

/**
 * Gửi prompt đến GPT
 */
async function callGPTWithCoT(prompt) {
  const chatCompletion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  return chatCompletion.choices[0]?.message?.content;
}

/**
 * Hàm xử lý RAG + CoT đầy đủ
 */
export async function answerWithCoT(question, contextChunks) {
  const prompt = generatePromptCoT(question, contextChunks);
  const answer = await callGPTWithCoT(prompt);
  return answer;
}
