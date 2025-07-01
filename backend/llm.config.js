// llm.config.js
module.exports = {
  providers: {
    "gpt-4o": {
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.2,
      maxTokens: 512,
    },
    "nous-hermes-2-mistral-7b-dpo": {
      baseURL: 'http://host.docker.internal:1234/v1',
      model: 'nous-hermes-2-mistral-7b-dpo',
      apiKey: 'lm-studio',
      temperature: 0.7,
      maxTokens: -1,
    }
  }
};