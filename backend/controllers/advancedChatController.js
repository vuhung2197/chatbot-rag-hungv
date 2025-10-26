import pool from '../db.js';
import { getEmbedding } from '../services/embeddingVector.js';
import { hashQuestion } from '../utils/hash.js';
import { StatusCodes } from 'http-status-codes';
import '../bootstrap/env.js';
import {
  multiStageRetrieval,
  semanticClustering,
  multiHopReasoning,
  fuseContext,
  adaptiveRetrieval,
  rerankContext
} from '../services/advancedRAGFixed.js';
import { callLLM } from './chatController.js';

/**
 * Advanced Chat Controller với Multi-Chunk Reasoning
 * Giải quyết câu hỏi phức tạp cần kết hợp nhiều nguồn thông tin
 */

/**
 * Chuyển đổi văn bản AI trả lời thành Markdown với cấu trúc tốt hơn
 */
function toAdvancedMarkdown(text) {
  if (!text) return '';

  const paragraphs = text.split(/\n{2,}/);
  let markdown = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Detect headers
    if (trimmed.match(/^#{1,6}\s/)) {
      markdown += `${trimmed}\n\n`;
      continue;
    }

    // Detect lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^[•\-+]\s/.test(trimmed)) {
      const points = trimmed
        .split(/(?:^|\n)[•\-+*]?\s*/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      points.forEach(point => {
        markdown += `- ${point}\n`;
      });
      markdown += '\n';
      continue;
    }

    // Detect code blocks
    if (trimmed.startsWith('```')) {
      markdown += `${trimmed}\n\n`;
      continue;
    }

    // Regular paragraph
    markdown += `${trimmed}\n\n`;
  }

  return markdown.trim();
}

/**
 * Advanced Chat API với Multi-Chunk Reasoning
 */
export async function advancedChat(req, res) {
  const { message, model } = req.body;
  const userId = req.user?.id;

  if (!message) {
    return res.status(StatusCodes.BAD_REQUEST).json({ 
      reply: 'No message!',
      reasoning_steps: [],
      chunks_used: []
    });
  }

  // Validate model
  if (!model || !model.url || !model.name) {
    console.error('❌ Invalid model configuration:', model);
    return res.status(StatusCodes.BAD_REQUEST).json({ 
      reply: 'Invalid model configuration!',
      reasoning_steps: [],
      chunks_used: []
    });
  }

  try {
    console.log('🧠 Advanced RAG processing:', message);
    console.log('📋 Model config:', {
      name: model.name,
      url: model.url,
      temperature: model.temperature,
      maxTokens: model.maxTokens
    });
    
    // 1. Tạo embedding cho câu hỏi
    let questionEmbedding;
    try {
      questionEmbedding = await getEmbedding(message);
    } catch (error) {
      console.error('❌ Lỗi tạo embedding:', error);
      return res.json({ 
        reply: 'Không thể xử lý câu hỏi này!',
        reasoning_steps: [],
        chunks_used: []
      });
    }

    // 2. Adaptive Retrieval - Điều chỉnh retrieval dựa trên độ phức tạp
    const retrievalParams = await adaptiveRetrieval(message, questionEmbedding);
    console.log('📊 Retrieval params:', retrievalParams);

    // 3. Multi-Stage Retrieval - Lấy chunks theo nhiều giai đoạn
    const allChunks = await multiStageRetrieval(
      questionEmbedding, 
      message, 
      retrievalParams.maxChunks
    );
    
    if (allChunks.length === 0) {
      await logUnanswered(message);
      return res.json({
        reply: 'Tôi chưa có kiến thức phù hợp để trả lời câu hỏi này.',
        reasoning_steps: ['Không tìm thấy chunks phù hợp'],
        chunks_used: []
      });
    }

    console.log(`📚 Retrieved ${allChunks.length} chunks`);

    // 4. Semantic Clustering - Nhóm chunks theo chủ đề
    let clusters = [];
    try {
      clusters = await semanticClustering(allChunks, questionEmbedding);
      console.log(`🔗 Created ${clusters.length} semantic clusters`);
    } catch (error) {
      console.error('❌ Error in semantic clustering:', error);
      clusters = [allChunks]; // Fallback to single cluster
    }

    // 5. Multi-Hop Reasoning - Tìm mối liên kết giữa chunks
    let reasoningChains = [];
    if (retrievalParams.useMultiHop) {
      try {
        reasoningChains = await multiHopReasoning(
          allChunks.slice(0, 5), 
          questionEmbedding, 
          message
        );
        console.log(`🔗 Created ${reasoningChains.length} reasoning chains`);
      } catch (error) {
        console.error('❌ Error in multi-hop reasoning:', error);
        reasoningChains = []; // Continue without reasoning
      }
    }

    // 6. Context Re-ranking - Sắp xếp lại context
    let rerankedChunks = allChunks;
    try {
      rerankedChunks = rerankContext(allChunks, questionEmbedding, message);
      console.log('📈 Reranked chunks by relevance and coherence');
    } catch (error) {
      console.error('❌ Error in context re-ranking:', error);
      // Use original chunks
    }

    // 7. Context Fusion - Kết hợp thông minh
    let fusedContext = '';
    try {
      fusedContext = fuseContext(rerankedChunks, reasoningChains, message);
      console.log('🔗 Fused context length:', fusedContext.length);
      
      // Debug: Log context preview để kiểm tra
      console.log('📄 Context preview:', `${fusedContext.substring(0, 200)}...`);
    } catch (error) {
      console.error('❌ Error in context fusion:', error);
      // Fallback to simple context
      fusedContext = rerankedChunks.map(c => `**${c.title}**: ${c.content}`).join('\n\n');
    }

    // 8. Advanced System Prompt
    const systemPrompt = `Bạn là một trợ lý AI chuyên nghiệp với khả năng phân tích và kết hợp thông tin từ nhiều nguồn.

Hướng dẫn trả lời:
1. Phân tích câu hỏi để xác định các khía cạnh cần trả lời
2. Kết hợp thông tin từ nhiều nguồn một cách logic
3. Tạo câu trả lời có cấu trúc rõ ràng với các phần:
   - Tóm tắt chính
   - Chi tiết từng khía cạnh
   - Kết luận và liên kết
4. Sử dụng markdown để format câu trả lời
5. Nếu thông tin không đủ, hãy nói rõ và đề xuất hướng tìm hiểu thêm`;

    // 9. Gọi LLM với context nâng cao - với timeout protection
    const t0 = Date.now();
    let reply = '';
    try {
      // Set timeout for LLM call - increased for complex processing
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LLM call timeout')), 180000)
      );
      
      const llmPromise = askAdvancedChatGPT(message, fusedContext, systemPrompt, model);
      reply = await Promise.race([llmPromise, timeoutPromise]);
    } catch (error) {
      console.error('❌ Error in LLM call for Advanced RAG:', {
        message: error.message,
        stack: error.stack,
        model: model?.name,
        model_url: model?.url
      });
      
      // Provide detailed error message
      if (error.message && error.message.includes('LLM API Error')) {
        reply = `Lỗi kết nối với model: ${error.message}`;
      } else if (error.message && error.message.includes('timeout')) {
        reply = 'Model mất quá nhiều thời gian để phản hồi. Vui lòng thử lại với câu hỏi ngắn gọn hơn.';
      } else {
        reply = 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi phức tạp này. Vui lòng thử lại với câu hỏi đơn giản hơn.';
      }
    }
    
    const t1 = Date.now();
    console.log('⏱️ Advanced RAG processing time:', t1 - t0, 'ms');

    // 10. Tạo reasoning steps để debug
    const reasoningSteps = [
      `Retrieved ${allChunks.length} chunks using multi-stage retrieval`,
      `Created ${clusters.length} semantic clusters`,
      `Generated ${reasoningChains.length} reasoning chains`,
      `Fused context with ${fusedContext.length} characters`,
      `Generated response using advanced RAG with model ${model.name}`
    ];

    // 11. Ghi lịch sử (không có metadata column)
    if (userId) {
      await pool.execute(
        'INSERT INTO user_questions (user_id, question, bot_reply, is_answered) VALUES (?, ?, ?, ?)',
        [userId, message, reply, true]
      );
    }

    res.json({ 
      reply: toAdvancedMarkdown(reply),
      reasoning_steps: reasoningSteps,
      chunks_used: rerankedChunks.map(c => ({
        id: c.id,
        title: c.title,
        content: c.content.substring(0, 200) + (c.content.length > 200 ? '...' : ''),
        score: c.final_score || c.score,
        stage: c.retrieval_stage,
        source: c.source || 'unknown',
        chunk_index: c.chunk_index || 0
      })),
      metadata: {
        total_chunks: allChunks.length,
        clusters: clusters.length,
        reasoning_chains: reasoningChains.length,
        processing_time: t1 - t0,
        model_used: model.name,
        context_length: fusedContext.length
      }
    });

  } catch (err) {
    console.error('❌ Advanced RAG error:', err);
    res.json({ 
      reply: 'Bot đang gặp sự cố với câu hỏi phức tạp này. Vui lòng thử lại!',
      reasoning_steps: ['Error in advanced processing'],
      chunks_used: []
    });
  }
}

/**
 * Gọi LLM với context nâng cao - sử dụng model được chọn
 */
async function askAdvancedChatGPT(question, context, systemPrompt, model) {
  // Giới hạn độ dài context để tránh lỗi và tăng tốc xử lý
  // Reduced from 8000 to 6000 for faster processing
  const maxContextLength = 6000;
  const truncatedContext = context.length > maxContextLength 
    ? `${context.substring(0, maxContextLength)}...` 
    : context;
  
  console.log(`📝 Context size: ${context.length} chars, truncated to: ${truncatedContext.length} chars`);

  const prompt = `# Câu hỏi: ${question}

# Thông tin tham khảo:
${truncatedContext}

# Hướng dẫn:
Hãy phân tích câu hỏi và sử dụng thông tin tham khảo để tạo câu trả lời toàn diện. 
Kết hợp thông tin từ nhiều nguồn một cách logic và có cấu trúc.`;

  // Validate và clean messages
  const messages = [
    { 
      role: 'system', 
      content: (systemPrompt || '').substring(0, 4000) // Giới hạn system prompt
    },
    { 
      role: 'user', 
      content: prompt.substring(0, 8000) // Reduced from 12000 to 8000 for faster processing
    }
  ];

  // Sử dụng model được chọn thay vì hardcode
  // Reduced max_tokens from 1000 to 800 for faster response
  const reply = await callLLM(model, messages, 0.3, 800);

  return reply;
}

/**
 * Log unanswered questions
 */
async function logUnanswered(question) {
  try {
    const hash = hashQuestion(question);
    const [rows] = await pool.execute(
      'SELECT 1 FROM unanswered_questions WHERE hash = ? LIMIT 1',
      [hash]
    );
    if (rows.length === 0) {
      await pool.execute(
        'INSERT INTO unanswered_questions (question, hash, created_at) VALUES (?, ?, NOW())',
        [question, hash]
      );
    }
  } catch (err) {
    console.error('❌ Lỗi log unanswered:', err);
  }
}

/**
 * Get advanced RAG statistics
 */
export async function getAdvancedRAGStats(req, res) {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_questions,
        AVG(JSON_EXTRACT(metadata, '$.chunks_used')) as avg_chunks,
        AVG(JSON_EXTRACT(metadata, '$.processing_time')) as avg_processing_time,
        COUNT(CASE WHEN JSON_EXTRACT(metadata, '$.reasoning_chains') > 0 THEN 1 END) as complex_questions
      FROM user_questions 
      WHERE metadata IS NOT NULL
    `);

    res.json({
      success: true,
      stats: stats[0]
    });
  } catch (err) {
    console.error('❌ Lỗi get stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

export default {
  advancedChat,
  getAdvancedRAGStats
};
