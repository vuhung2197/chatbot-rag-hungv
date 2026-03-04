/**
 * Chia nội dung thành các chunk theo đoạn văn, giữ ngữ nghĩa trọn vẹn.
 * @param {string} content - nội dung toàn bộ văn bản
 * @param {number} maxWords - số từ tối đa mỗi chunk
 * @returns {string[]} danh sách các chunk
 */
export function splitIntoSemanticChunks(content, maxWords = 100) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let state = {
    chunks: [],
    currentChunk: '',
    wordCount: 0
  };

  for (const paragraph of paragraphs) {
    processParagraph(paragraph, maxWords, state);
  }

  if (state.currentChunk.trim()) {
    state.chunks.push(state.currentChunk.trim());
  }
  return state.chunks;
}

function processParagraph(paragraph, maxWords, state) {
  const paragraphWordCount = paragraph.split(/\s+/).length;

  if (paragraphWordCount > maxWords) {
    processLongParagraphBySentences(paragraph, maxWords, state);
  } else {
    processShortParagraph(paragraph, paragraphWordCount, maxWords, state);
  }
}

function processLongParagraphBySentences(paragraph, maxWords, state) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;
    if (state.wordCount + sentenceWords > maxWords) {
      if (state.currentChunk.trim()) {
        state.chunks.push(state.currentChunk.trim());
      }
      state.currentChunk = sentence;
      state.wordCount = sentenceWords;
    } else {
      state.currentChunk += ` ${sentence}`;
      state.wordCount += sentenceWords;
    }
  }
}

function processShortParagraph(paragraph, paragraphWordCount, maxWords, state) {
  if (state.wordCount + paragraphWordCount > maxWords) {
    if (state.currentChunk.trim()) {
      state.chunks.push(state.currentChunk.trim());
    }
    state.currentChunk = paragraph;
    state.wordCount = paragraphWordCount;
  } else {
    state.currentChunk += state.currentChunk ? `\n\n${paragraph}` : paragraph;
    state.wordCount += paragraphWordCount;
  }
}
