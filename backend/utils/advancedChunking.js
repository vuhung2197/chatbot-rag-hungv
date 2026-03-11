/**
 * Thuật toán chia chunk thông minh - giữ ngữ nghĩa trọn vẹn
 * @param {string} content - nội dung văn bản
 * @param {Object} options - cấu hình chunking
 * @returns {Array} danh sách chunks với metadata
 */
export function advancedSemanticChunking(content, options = {}) {
  const {
    minChunkSize = 50,
    maxChunkSize = 300,
    overlapRatio = 0.2,
    preserveStructure = true
  } = options;

  // 1. Phân tích cấu trúc văn bản
  const structure = analyzeDocumentStructure(content);

  // 2. Tạo semantic boundaries
  const boundaries = findSemanticBoundaries(content, structure);

  // 3. Chia chunk theo boundaries
  const chunks = createSemanticChunks(content, boundaries, {
    minChunkSize,
    maxChunkSize,
    overlapRatio
  });

  return chunks;
}

/**
 * Phân tích cấu trúc văn bản để nhận diện các phần quan trọng
 */
function analyzeDocumentStructure(content) {
  const structure = { sections: [], paragraphs: [], lists: [], caseStudies: [] };
  const lines = content.split('\n');
  let state = { currentSection: null, currentParagraph: '', inList: false };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    processDocumentLine(line, i, structure, state);
  }

  if (state.currentParagraph.trim()) {
    structure.paragraphs.push({
      content: state.currentParagraph.trim(),
      startLine: lines.length - state.currentParagraph.split('\n').length,
      endLine: lines.length - 1
    });
  }

  return structure;
}

function processDocumentLine(line, i, structure, state) {
  if (line.match(/^#{1,6}\s/) || line.match(/^\d+\.\s/)) {
    handleHeadingLine(line, i, structure, state);
  }
  else if (line.match(/^[-•*]\s/) || line.match(/^\d+\)\s/)) {
    handleListLine(line, i, structure, state);
  }
  else if (line.toLowerCase().includes('case study') || line.toLowerCase().includes('ví dụ') || line.toLowerCase().includes('ứng dụng')) {
    structure.caseStudies.push({ title: line, startLine: i });
  }
  else if (line.length > 0) {
    state.currentParagraph += `${line}\n`;
  }
  else if (state.currentParagraph.trim()) {
    structure.paragraphs.push({
      content: state.currentParagraph.trim(),
      startLine: i - state.currentParagraph.split('\n').length,
      endLine: i - 1
    });
    state.currentParagraph = '';
    state.inList = false;
  }
}

function handleHeadingLine(line, i, structure, state) {
  if (state.currentParagraph) {
    structure.paragraphs.push({
      content: state.currentParagraph.trim(),
      startLine: i - state.currentParagraph.split('\n').length,
      endLine: i - 1
    });
    state.currentParagraph = '';
  }

  state.currentSection = {
    title: line,
    startLine: i,
    type: line.match(/^#{1,6}\s/) ? 'heading' : 'numbered'
  };
  structure.sections.push(state.currentSection);
}

function handleListLine(line, i, structure, state) {
  if (!state.inList) {
    state.inList = true;
    structure.lists.push({ startLine: i, items: [] });
  }
  structure.lists[structure.lists.length - 1].items.push({ content: line, line: i });
}

/**
 * Tìm các ranh giới ngữ nghĩa để chia chunk
 */
function findSemanticBoundaries(content, structure) {
  const boundaries = [];
  const lines = content.split('\n');

  // Ranh giới tại tiêu đề
  structure.sections.forEach(section => {
    boundaries.push({
      type: 'section',
      line: section.startLine,
      priority: 'high',
      title: section.title
    });
  });

  // Ranh giới tại cuối đoạn văn
  structure.paragraphs.forEach(paragraph => {
    if (paragraph.content.split(/\s+/).length > 20) { // Đoạn văn dài
      boundaries.push({
        type: 'paragraph',
        line: paragraph.endLine,
        priority: 'medium',
        content: `${paragraph.content.substring(0, 100)}...`
      });
    }
  });

  // Ranh giới tại case study
  structure.caseStudies.forEach(caseStudy => {
    boundaries.push({
      type: 'case_study',
      line: caseStudy.startLine,
      priority: 'high',
      title: caseStudy.title
    });
  });

  // Sắp xếp theo thứ tự dòng
  return boundaries.sort((a, b) => a.line - b.line);
}

/**
 * Tạo chunks dựa trên boundaries
 */
function createSemanticChunks(content, boundaries, options) {
  const { minChunkSize, maxChunkSize, overlapRatio } = options;
  const lines = content.split('\n');
  const chunks = [];

  let currentChunk = '';
  let currentStartLine = 0;
  let lastBoundary = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const wordCount = currentChunk.split(/\s+/).length;

    // Kiểm tra boundary
    const boundary = boundaries.find(b => b.line === i);

    if (boundary && boundary.priority === 'high') {
      // Chia chunk tại tiêu đề quan trọng
      if (currentChunk.trim() && wordCount >= minChunkSize) {
        chunks.push(createChunkMetadata(currentChunk.trim(), currentStartLine, i - 1, lastBoundary));
      }
      currentChunk = `${line}\n`;
      currentStartLine = i;
      lastBoundary = boundary;
    }
    else if (wordCount >= maxChunkSize) {
      // Chia chunk khi quá dài
      chunks.push(createChunkMetadata(currentChunk.trim(), currentStartLine, i - 1, lastBoundary));

      // Tạo overlap
      const overlapText = createOverlap(currentChunk, overlapRatio);
      currentChunk = `${overlapText + line}\n`;
      currentStartLine = i - overlapText.split('\n').length;
    }
    else {
      currentChunk += `${line}\n`;
    }
  }

  // Thêm chunk cuối
  if (currentChunk.trim()) {
    chunks.push(createChunkMetadata(currentChunk.trim(), currentStartLine, lines.length - 1, lastBoundary));
  }

  return chunks;
}

/**
 * Tạo metadata cho chunk
 */
function createChunkMetadata(content, startLine, endLine, boundary) {
  const wordCount = content.split(/\s+/).length;
  const sentenceCount = (content.match(/[.!?]+/g) || []).length;

  return {
    content,
    metadata: {
      wordCount,
      sentenceCount,
      startLine,
      endLine,
      boundary: boundary?.type || 'none',
      boundaryTitle: boundary?.title || null,
      isComplete: content.endsWith('.') || content.endsWith('!') || content.endsWith('?'),
      hasContext: wordCount > 30
    }
  };
}

/**
 * Tạo overlap giữa các chunk
 */
function createOverlap(text, ratio) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const overlapSentences = Math.max(1, Math.floor(sentences.length * ratio));
  return sentences.slice(-overlapSentences).join(' ');
}

/**
 * Chunking cho văn bản học thuật (tối ưu cho NLP content)
 */
export function academicChunking(content) {
  return advancedSemanticChunking(content, {
    minChunkSize: 80,
    maxChunkSize: 250,
    overlapRatio: 0.25,
    preserveStructure: true
  });
}

/**
 * Chunking cho case study (giữ nguyên case study)
 */
export function caseStudyChunking(content) {
  return advancedSemanticChunking(content, {
    minChunkSize: 100,
    maxChunkSize: 400,
    overlapRatio: 0.3,
    preserveStructure: true
  });
}
