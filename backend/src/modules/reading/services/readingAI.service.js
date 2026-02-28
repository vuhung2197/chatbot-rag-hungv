import { callLLM } from '#services/llmService.js';

export const readingAiService = {

  // Sinh bài đọc mới theo level + topic
  async generatePassage(level, topic) {
    const wordRange = { A1: '80-120', A2: '120-200', B1: '200-350', B2: '300-450', C1: '400-550', C2: '450-600' };

    const systemPrompt = `You are an English reading content creator for CEFR ${level} learners.
Generate an engaging reading passage about "${topic}" with these requirements:
- CEFR Level ${level}: Use ONLY vocabulary and grammar appropriate for this level.
- Length: ${wordRange[level] || '200-400'} words.
- Include a compelling title.
- Make the content interesting, informative, and culturally relevant.
- Create exactly 5 quiz questions (mix of multiple_choice and true_false_ng types).
- Identify 4-6 vocabulary words that ${level} learners should learn, with Vietnamese translations.

Return standard JSON format ONLY (no markdown, no explanation):
{
  "title": "Article title here",
  "content": "Full article text here...",
  "summary": "1-2 sentence summary",
  "wordCount": 250,
  "difficultyWords": [
    { "word": "sustainable", "definition": "able to continue over time", "translation": "bền vững" }
  ],
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "What is the main idea?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "B",
      "explanation": "The passage says..."
    },
    {
      "id": 2,
      "type": "true_false_ng",
      "statement": "The author believes X.",
      "correctAnswer": "True",
      "explanation": "The passage states..."
    }
  ]
}`;

    try {
      const modelConfig = {
        name: 'gpt-4o-mini',
        url: 'https://api.openai.com/v1',
        temperature: 0.8,
        maxTokens: 2000
      };
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a ${level} reading passage about: ${topic}` }
      ];
      const result = await callLLM(modelConfig, messages);

      const parsed = JSON.parse(result.replace(/```json\n?|```/g, '').trim());
      return parsed;
    } catch (error) {
      console.error('Reading AI generate failed:', error);
      throw new Error(`AI failed to generate reading passage: ${  error.message}`);
    }
  },

  // Tra nghĩa từ trong ngữ cảnh
  async lookupWord(word, sentence, level) {
    const systemPrompt = `You are a helpful English-Vietnamese dictionary for CEFR ${level} learners.
The user clicked on the word "${word}" in this sentence: "${sentence}"

Provide a clear, helpful explanation. Return JSON ONLY:
{
  "word": "${word}",
  "pronunciation": "/pronunciation/",
  "partOfSpeech": "noun/verb/adj/adv/etc",
  "definition": "Simple English definition suitable for ${level}",
  "translation": "Vietnamese translation",
  "exampleInContext": "How the word is used in the given sentence",
  "synonyms": ["synonym1", "synonym2"],
  "note": "Any helpful grammar or usage tip (in Vietnamese)"
}`;

    try {
      const modelConfig = {
        name: 'gpt-4o-mini',
        url: 'https://api.openai.com/v1',
        temperature: 0.3,
        maxTokens: 500
      };
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Look up: "${word}" in context: "${sentence}"` }
      ];
      const result = await callLLM(modelConfig, messages);

      return JSON.parse(result.replace(/```json\n?|```/g, '').trim());
    } catch (error) {
      console.error('Word lookup failed:', error);
      throw new Error(`Cannot look up word: ${  error.message}`);
    }
  }
};

export default readingAiService;
