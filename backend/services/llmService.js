import axios from 'axios';

/**
 * Gọi API mô hình ngôn ngữ
 */
export async function callLLM(model, messages, _temperature = 0.2, _maxTokens = 512) {
    if (!model || !model.url || !model.name) {
        throw new Error('Invalid model configuration: missing url or name');
    }

    const baseUrl = model.url;
    const nameModel = model.name;
    const temperatureModel = model.temperature !== undefined ? model.temperature : _temperature;
    const maxTokensModel = model.maxTokens !== undefined ? model.maxTokens : _maxTokens;

    const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const fullUrl = `${normalizedUrl}/chat/completions`;

    console.log('🔗 Calling LLM:', {
        url: fullUrl,
        model: nameModel,
        temperature: temperatureModel,
        max_tokens: maxTokensModel,
        messages_count: messages.length
    });

    try {
        const response = await axios.post(
            fullUrl,
            {
                model: nameModel,
                messages,
                temperature: temperatureModel,
                max_tokens: maxTokensModel,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                timeout: 180000,
            }
        );

        const content = response.data.choices[0].message.content.trim();
        console.log('✅ LLM response received successfully');
        return content;
    } catch (error) {
        console.error('❌ LLM call error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });
        throw new Error(`LLM API Error: ${error.message} - ${error.response?.data ? JSON.stringify(error.response.data) : ''}`);
    }
}
