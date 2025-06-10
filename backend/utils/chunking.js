const { split } = require("sentence-splitter");

/**
 * Chia nội dung thành các chunk theo đoạn văn, giữ ngữ nghĩa trọn vẹn.
 * @param {string} content - nội dung toàn bộ văn bản
 * @param {number} maxWords - số từ tối đa mỗi chunk
 * @returns {string[]} danh sách các chunk
 */
function splitIntoSemanticChunks(content, maxWords = 100) {
  const paragraphs = content
    .split(/\n\s*\n/)  // Tách đoạn văn theo dòng trống
    .map(p => p.trim())
    .filter(p => p.length > 0);  // Loại bỏ đoạn rỗng

  const chunks = [];
  let currentChunk = "";
  let wordCount = 0;

  for (const paragraph of paragraphs) {
    const paragraphWordCount = paragraph.split(/\s+/).length;

    // Nếu đoạn văn lớn hơn maxWords, chia nhỏ bằng câu
    if (paragraphWordCount > maxWords) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      for (const sentence of sentences) {
        const sentenceWords = sentence.split(/\s+/).length;
        if (wordCount + sentenceWords > maxWords) {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = sentence;
          wordCount = sentenceWords;
        } else {
          currentChunk += " " + sentence;
          wordCount += sentenceWords;
        }
      }
    } else {
      if (wordCount + paragraphWordCount > maxWords) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = paragraph;
        wordCount = paragraphWordCount;
      } else {
        currentChunk += "\n\n" + paragraph;
        wordCount += paragraphWordCount;
      }
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

module.exports = { splitIntoSemanticChunks };