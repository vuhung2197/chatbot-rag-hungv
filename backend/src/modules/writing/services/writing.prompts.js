// =============================================================================
// AI Prompt Templates cho tính năng Writing Practice
// =============================================================================

/**
 * Tạo System Prompt và User Message cho LLM để chấm bài
 * @param {object} exercise - Thông tin bài tập (level, type, prompt)
 * @param {string} userContent - Nội dung bài làm của học viên
 * @returns {Array} Mảng các message gửi vào OpenAI API
 */
export function buildGradingPrompt(exercise, userContent) {
  const { level, type, prompt: taskPrompt } = exercise;

  // CEFR Level Expectations
  const levelExpectations = {
    'A1': 'Use simple sentences and basic vocabulary. Correct basic grammar (present simple).',
    'A2': 'Use basic compound sentences with simple connectors (and, but, because). Past/present tense.',
    'B1': 'Express ideas clearly. Use mixed tenses correctly. Display intermediate vocabulary.',
    'B2': 'Well-structured paragraphs. Good argument flow. Complex sentences and advanced vocabulary.',
    'C1': 'High level of fluency, coherence, and accuracy. Sophisticated vocabulary and idiomatic expressions.',
    'C2': 'Near-native mastery. Academic tone, precise vocabulary, flawless structural complexity.'
  };

  const expectation = levelExpectations[level] || 'General English proficiency.';

  const systemPrompt = `You are an expert Cambridge English Teacher examining a student's writing.
Your job is to objectively evaluate the submission based on the CEFR level: ${level}.
Expectations for level ${level}: ${expectation}

You MUST return your response ONLY as a valid JSON object matching the exact structure below, without any markdown formatting or extra text.
{
  "scores": {
    "total": <number 0-100, weighted average of the 4 criteria>,
    "grammar": <number 0-100, accuracy and variety of grammar>,
    "vocabulary": <number 0-100, lexical resource and correct usage>,
    "coherence": <number 0-100, logical flow, paragraphs, linking words>,
    "task": <number 0-100, did they answer the prompt fully?>
  },
  "errors": [
    {
      "original": "<the exact incorrect chunk/sentence from the student's text>",
      "correction": "<the corrected version>",
      "explanation": "<short explanation of why it was wrong>"
    }
  ],
  "suggestions": [
    "<string of general suggestion for improvement 1>",
    "<string of general suggestion for improvement 2>"
  ],
  "modelAnswer": "<a complete model answer written at exactly a ${level} level that perfectly answers the prompt>",
  "newWords": [
    {
      "word": "<vocabulary word from your model answer or suggestions>",
      "definition": "<english definition>",
      "translation": "<vietnamese meaning of the word>",
      "example": "<example sentence using the word>",
      "level": "${level}"
    }
  ],
  "grammarItems": [
    {
      "word": "<the name of grammar point or the incorrect chunk>",
      "grammar_error": "<the exact incorrect grammar chunk/sentence from the student's text>",
      "grammar_correction": "<the corrected grammatical version>",
      "definition": "<explanation of the rule being practiced>",
      "level": "${level}"
    }
  ]
}

Ensure "errors" only contains real mistakes made by the student. If the text is perfect, leave "errors" empty.
CRITICAL: If the student's submission is completely off-topic, random gibberish, not in English, or too short to practically grade, you MUST still return the valid JSON. Set all scores to 0 or a very low number, leave "errors" empty, and use "suggestions" to explain that the text could not be graded and why. Do NOT fail or return plain text.
Ensure the JSON is perfectly valid and can be parsed by JSON.parse(). Do NOT wrap the JSON in \`\`\`json tags.`;

  const userMessage = `Task Type: ${type}
Task Prompt: ${taskPrompt}

Student's Submission:
"""
${userContent}
"""`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];
}
