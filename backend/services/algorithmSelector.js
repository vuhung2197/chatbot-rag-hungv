import pool from "../db.js";
import { normalizeText } from "./textUtils.js";

/**
 * Hệ thống tự động chọn thuật toán xử lý câu hỏi
 * - Phân tích câu hỏi để xác định loại và nội dung
 * - Tự động chọn thuật toán phù hợp: RAG+chunk, score context, hoặc direct mode
 */

/**
 * Kiểm tra xem câu hỏi có liên quan đến kiến thức đã học trước đó không
 * @param {string} question - Câu hỏi người dùng
 * @returns {Promise<Object>} - Kết quả phân tích với điểm số và từ khóa
 */
async function analyzeQuestionRelevance(question) {
  try {
    // Lấy danh sách từ khóa quan trọng
    const [kwRows] = await pool.execute("SELECT keyword FROM important_keywords");
    const importantKeywords = kwRows.map(r => r.keyword.toLowerCase());
    
    // Lấy mẫu tiêu đề kiến thức để phân tích
    const [titleRows] = await pool.execute("SELECT DISTINCT title FROM knowledge_base LIMIT 100");
    const knowledgeTitles = titleRows.map(r => r.title.toLowerCase());
    
    const normalizedQuestion = normalizeText(question);
    const questionWords = normalizedQuestion.split(' ').filter(w => w.length > 2);
    
    // Tính điểm liên quan đến kiến thức đã có
    let relevanceScore = 0;
    let matchedKeywords = [];
    let matchedTopics = [];
    
    // Kiểm tra từ khóa quan trọng
    importantKeywords.forEach(keyword => {
      if (normalizedQuestion.includes(keyword.toLowerCase())) {
        relevanceScore += 3;
        matchedKeywords.push(keyword);
      }
    });
    
    // Kiểm tra tiêu đề chủ đề
    knowledgeTitles.forEach(title => {
      const titleWords = title.split(' ').filter(w => w.length > 2);
      const commonWords = titleWords.filter(word => 
        questionWords.some(qw => qw.includes(word) || word.includes(qw))
      );
      
      if (commonWords.length > 0) {
        relevanceScore += commonWords.length * 2;
        matchedTopics.push(title);
      }
    });
    
    // Kiểm tra độ tương đồng từ vựng chung
    const vocabularyScore = questionWords.filter(word => 
      importantKeywords.some(kw => kw.includes(word) || word.includes(kw))
    ).length;
    
    relevanceScore += vocabularyScore;
    
    return {
      relevanceScore,
      matchedKeywords,
      matchedTopics,
      questionLength: question.length,
      questionWords: questionWords.length,
      isKnowledgeRelated: relevanceScore > 2
    };
  } catch (error) {
    console.error("❌ Lỗi phân tích câu hỏi:", error);
    return {
      relevanceScore: 0,
      matchedKeywords: [],
      matchedTopics: [],
      questionLength: question.length,
      questionWords: 0,
      isKnowledgeRelated: false
    };
  }
}

/**
 * Phân loại loại câu hỏi dựa trên nội dung và cấu trúc
 * @param {string} question - Câu hỏi người dùng
 * @returns {Object} - Thông tin phân loại câu hỏi
 */
function categorizeQuestion(question) {
  const normalizedQ = question.toLowerCase().trim();
  
  // Các pattern để nhận diện loại câu hỏi
  const patterns = {
    definition: /^(.*)(là gì|what is|nghĩa là gì|định nghĩa|khái niệm)/,
    explanation: /^(tại sao|why|làm thế nào|how|giải thích|explain)/,
    comparison: /^(so sánh|khác nhau|giống|compare|difference)/,
    procedure: /^(cách làm|how to|làm sao|quy trình|steps)/,
    factual: /^(khi nào|when|ở đâu|where|ai|who|bao nhiêu|how many|how much)/,
    conversational: /^(chào|hello|hi|cảm ơn|thank|xin lỗi|sorry|tạm biệt|goodbye)/,
    general: /^(bạn|you|ai|what|gì|sao|thế nào)/
  };
  
  let questionType = 'general';
  let confidence = 0.5;
  
  // Xác định loại câu hỏi
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(normalizedQ)) {
      questionType = type;
      confidence = 0.8;
      break;
    }
  }
  
  // Đánh giá độ phức tạp
  const complexity = question.length > 50 ? 'complex' : 
                    question.length > 20 ? 'medium' : 'simple';
  
  return {
    type: questionType,
    complexity,
    confidence,
    isConversational: questionType === 'conversational',
    needsContext: ['definition', 'explanation', 'comparison', 'procedure'].includes(questionType)
  };
}

/**
 * Chọn thuật toán xử lý phù hợp nhất cho câu hỏi
 * @param {string} question - Câu hỏi người dùng
 * @param {number} userId - ID người dùng (optional)
 * @returns {Promise<Object>} - Thuật toán được chọn và thông tin phân tích
 */
export async function selectAlgorithm(question, userId = null) {
  try {
    // Phân tích mức độ liên quan đến kiến thức
    const relevanceAnalysis = await analyzeQuestionRelevance(question);
    
    // Phân loại câu hỏi
    const questionCategory = categorizeQuestion(question);
    
    // Logic chọn thuật toán
    let selectedAlgorithm = 'direct';
    let confidence = 0.5;
    let reason = 'Mặc định';
    
    // Nếu câu hỏi có tính chất trò chuyện hoặc chào hỏi đơn giản
    if (questionCategory.isConversational) {
      selectedAlgorithm = 'direct';
      confidence = 0.9;
      reason = 'Câu hỏi trò chuyện, sử dụng direct mode';
    }
    // Nếu câu hỏi có liên quan cao đến kiến thức đã học
    else if (relevanceAnalysis.isKnowledgeRelated && relevanceAnalysis.relevanceScore > 5) {
      // Chọn giữa RAG và score context
      if (relevanceAnalysis.matchedKeywords.length > 2 || questionCategory.needsContext) {
        // Nhiều từ khóa trùng khớp -> dùng score context
        selectedAlgorithm = 'context';
        confidence = 0.85;
        reason = `Tìm thấy ${relevanceAnalysis.matchedKeywords.length} từ khóa quan trọng, dùng score context`;
      } else {
        // Ít từ khóa nhưng có liên quan -> dùng RAG embedding
        selectedAlgorithm = 'embedding';
        confidence = 0.8;
        reason = 'Câu hỏi liên quan đến kiến thức, dùng RAG embedding';
      }
    }
    // Nếu câu hỏi có một số liên quan nhưng không cao
    else if (relevanceAnalysis.isKnowledgeRelated && relevanceAnalysis.relevanceScore > 2) {
      selectedAlgorithm = 'embedding';
      confidence = 0.7;
      reason = 'Câu hỏi có thể liên quan đến kiến thức, thử RAG embedding';
    }
    // Câu hỏi không liên quan đến kiến thức đã học
    else {
      selectedAlgorithm = 'direct';
      confidence = 0.8;
      reason = 'Câu hỏi không liên quan đến kiến thức đã học, dùng direct mode';
    }
    
    // Ghi log quyết định để phân tích và cải thiện
    console.log(`🤖 Algorithm Selection:`, {
      question: question.substring(0, 100) + '...',
      selected: selectedAlgorithm,
      confidence,
      reason,
      relevanceScore: relevanceAnalysis.relevanceScore,
      questionType: questionCategory.type,
      matchedKeywords: relevanceAnalysis.matchedKeywords.length
    });
    
    return {
      algorithm: selectedAlgorithm,
      confidence,
      reason,
      analysis: {
        relevance: relevanceAnalysis,
        category: questionCategory
      }
    };
    
  } catch (error) {
    console.error("❌ Lỗi chọn thuật toán:", error);
    return {
      algorithm: 'direct',
      confidence: 0.5,
      reason: 'Lỗi phân tích, sử dụng direct mode mặc định',
      analysis: null
    };
  }
}

/**
 * Lưu thống kê về việc chọn thuật toán để cải thiện hệ thống
 * @param {string} question - Câu hỏi
 * @param {string} selectedAlgorithm - Thuật toán được chọn  
 * @param {number} confidence - Độ tin cậy
 * @param {Object} analysis - Kết quả phân tích
 * @param {number} userId - ID người dùng
 */
export async function logAlgorithmSelection(question, selectedAlgorithm, confidence, analysis, userId = null) {
  try {
    await pool.execute(`
      INSERT INTO algorithm_selections 
      (user_id, question, selected_algorithm, confidence, relevance_score, matched_keywords, question_type, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId,
      question,
      selectedAlgorithm,
      confidence,
      analysis?.relevance?.relevanceScore || 0,
      JSON.stringify(analysis?.relevance?.matchedKeywords || []),
      analysis?.category?.type || 'unknown'
    ]);
  } catch (error) {
    console.warn("⚠️ Không thể lưu log algorithm selection:", error.message);
  }
}