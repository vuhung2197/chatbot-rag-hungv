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

// ==================== CACHE SYSTEM ====================
const CACHE_TTL_MS = parseInt(process.env.WEB_SEARCH_CACHE_TTL_MS) || 3600000; // Default 1 giờ
const CACHE_MAX_SIZE = parseInt(process.env.WEB_SEARCH_CACHE_MAX_SIZE) || 200;  // Tối đa 200 entries
const searchCache = new Map();
let cacheStats = { hits: 0, misses: 0, evictions: 0 };

/**
 * Normalize query để tăng cache hit rate
 * "Giá vàng hôm nay?" → "giá vàng hôm nay"
 */
function normalizeQuery(query) {
    return query.trim().toLowerCase().replace(/[?!.]+$/g, '');
}

/**
 * Dọn dẹp cache entries đã hết hạn
 */
function cleanExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of searchCache) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
            searchCache.delete(key);
            cacheStats.evictions++;
        }
    }
}

/**
 * Evict entries cũ nhất khi cache đầy
 */
function evictOldestIfFull() {
    if (searchCache.size >= CACHE_MAX_SIZE) {
        // Xóa entry cũ nhất
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
        cacheStats.evictions++;
    }
}

/**
 * Lấy cache stats (cho admin/monitoring)
 */
export function getCacheStats() {
    cleanExpiredCache();
    const total = cacheStats.hits + cacheStats.misses;
    return {
        size: searchCache.size,
        maxSize: CACHE_MAX_SIZE,
        ttlMs: CACHE_TTL_MS,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        evictions: cacheStats.evictions,
        hitRate: total > 0 ? `${((cacheStats.hits / total) * 100).toFixed(1)}%` : 'N/A'
    };
}

/**
 * Xóa toàn bộ cache (cho admin)
 */
export function clearSearchCache() {
    searchCache.clear();
    cacheStats = { hits: 0, misses: 0, evictions: 0 };
    console.log('🗑️ Web Search cache cleared.');
}

// ==================== MAIN SEARCH FUNCTION ====================

/**
 * Thực hiện tìm kiếm web (có cache)
 * @param {string} query - Câu hỏi cần tìm
 * @param {object} options - Tùy chọn tìm kiếm
 * @param {string} options.searchDepth - 'basic' (mặc định) hoặc 'advanced' (cho premium users)
 * @returns {Promise<{context: string, sources: Array<{title: string, url: string}>}>}
 */
export async function performWebSearch(query, options = {}) {
    const { searchDepth = 'basic' } = options;
    // Check cache trước
    const cacheKey = normalizeQuery(query);
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        cacheStats.hits++;
        console.log(`⚡ Web Search CACHE HIT for: "${query}" (saved 1 API call, age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
        return cached.result;
    }
    cacheStats.misses++;

    let apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        apiKey = loadApiKeyBackup();
    }

    if (!apiKey) {
        console.warn('⚠️ WEB SEARCH DISABLED: Missing TAVILY_API_KEY in .env');
        return 'Chức năng tìm kiếm web chưa được cấu hình (Thiếu API Key).';
    }

    try {
        console.log(`🌍 Searching Web for: "${query}"...`);
        const startTime = Date.now();

        const response = await axios.post(TAVILY_API_URL, {
            api_key: apiKey,
            query,
            search_depth: searchDepth, // 'basic' (free) hoặc 'advanced' (premium)
            include_answer: true,  // Tavily tự generate câu trả lời ngắn
            include_images: false,
            include_raw_content: false,
            max_results: 5,
        }, {
            timeout: 10000 // 10s timeout
        });

        const data = response.data;
        const endTime = Date.now();
        console.log(`✅ Web Search completed in ${endTime - startTime}ms (depth: ${searchDepth}). Found ${data.results.length} results.`);

        const result = formatSearchResults(data);

        // Lưu vào cache
        cleanExpiredCache();
        evictOldestIfFull();
        searchCache.set(cacheKey, { result, timestamp: Date.now() });
        console.log(`💾 Cached search result (cache size: ${searchCache.size}/${CACHE_MAX_SIZE}, hit rate: ${getCacheStats().hitRate})`);

        return result;

    } catch (error) {
        console.error('❌ Web Search Error:', error.response?.data || error.message);
        return 'Xin lỗi, tôi gặp lỗi khi cố gắng tìm kiếm trên internet. Vui lòng thử lại sau.';
    }
}

function loadApiKeyBackup() {
    console.log('⚠️ API Key missing, attempting robust hot-reload...');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const envPaths = [
        path.resolve(__dirname, '../../.env'),
        path.resolve(__dirname, '../.env')
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
    const apiKey = process.env.TAVILY_API_KEY;
    console.log('Reloaded Key:', apiKey ? 'FOUND' : 'NOT FOUND');
    return apiKey;
}

function formatSearchResults(data) {
    let context = `# KẾT QUẢ TÌM KIẾM WEB (Thời gian hiện tại: ${new Date().toLocaleString('vi-VN')}):\n\n`;
    if (data.answer) {
        context += `## Tóm tắt nhanh:\n${data.answer}\n\n`;
    }
    const sources = [];
    data.results.forEach((result, index) => {
        context += `## Nguồn ${index + 1}: ${result.title}\n`;
        context += `**URL:** ${result.url}\n`;
        context += `**Sơ lược:** ${result.content}\n\n`;
        sources.push({ title: result.title, url: result.url });
    });
    return { context, sources };
}
