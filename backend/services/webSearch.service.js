import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Service tìm kiếm thông tin trên Web sử dụng Tavily AI
 * Tavily là search engine tối ưu cho LLM (trả về text clean, không rác)
 */
const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Thực hiện tìm kiếm web
 * @param {string} query - Câu hỏi cần tìm
 * @returns {Promise<string>} - Context đã format để đưa vào prompt
 */
export async function performWebSearch(query) {
    let apiKey = process.env.TAVILY_API_KEY;

    // Hot-reload .env if key is missing (tránh phải restart server)
    if (!apiKey) {
        console.log('⚠️ API Key missing, attempting robust hot-reload...');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const envPaths = [
            path.resolve(__dirname, '../../.env'), // Root
            path.resolve(__dirname, '../.env')     // Backend
        ];

        for (const envPath of envPaths) {
            if (fs.existsSync(envPath)) {
                console.log(`Loading env from: ${envPath}`);
                try {
                    const envConfig = dotenv.parse(fs.readFileSync(envPath));
                    for (const k in envConfig) {
                        process.env[k] = envConfig[k];
                    }
                } catch (e) {
                    console.error(`Error reading ${envPath}:`, e);
                }
            }
        }

        apiKey = process.env.TAVILY_API_KEY;
        console.log('Reloaded Key:', apiKey ? 'FOUND' : 'NOT FOUND');
    }

    if (!apiKey) {
        console.warn('⚠️ WEB SEARCH DISABLED: Missing TAVILY_API_KEY in .env');
        return "Chức năng tìm kiếm web chưa được cấu hình (Thiếu API Key).";
    }

    try {
        console.log(`🌍 Searching Web for: "${query}"...`);
        const startTime = Date.now();

        const response = await axios.post(TAVILY_API_URL, {
            api_key: apiKey,
            query: query,
            search_depth: "basic", // "advanced" tốn credit hơn
            include_answer: true,  // Tavily tự generate câu trả lời ngắn
            include_images: false,
            include_raw_content: false,
            max_results: 5,
        }, {
            timeout: 10000 // 10s timeout
        });

        const data = response.data;
        const endTime = Date.now();
        console.log(`✅ Web Search completed in ${endTime - startTime}ms. Found ${data.results.length} results.`);

        // Format kết quả
        let context = `# KẾT QUẢ TÌM KIẾM WEB (Thời gian hiện tại: ${new Date().toLocaleString('vi-VN')}):\n\n`;

        // Nếu Tavily có câu trả lời trực tiếp
        if (data.answer) {
            context += `## Tóm tắt nhanh:\n${data.answer}\n\n`;
        }

        // Chi tiết từng trang
        data.results.forEach((result, index) => {
            context += `## Nguồn ${index + 1}: ${result.title}\n`;
            context += `**URL:** ${result.url}\n`;
            context += `**Sơ lược:** ${result.content}\n\n`;
        });

        return context;

    } catch (error) {
        console.error('❌ Web Search Error:', error.response?.data || error.message);
        return "Xin lỗi, tôi gặp lỗi khi cố gắng tìm kiếm trên internet. Vui lòng thử lại sau.";
    }
}
