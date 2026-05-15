function extractTopic(title, content) {
    const text = `${title || ''} ${content || ''}`.toLowerCase();
    if (text.includes('nlp') || text.includes('xử lý ngôn ngữ')) return 'NLP';
    if (text.includes('ai') || text.includes('trí tuệ nhân tạo')) return 'AI';
    if (text.includes('machine learning') || text.includes('học máy')) return 'Machine Learning';
    if (text.includes('chatbot') || text.includes('trợ lý')) return 'Chatbot';
    if (text.includes('vector') || text.includes('embedding')) return 'Vector Search';
    return 'Khác';
}

function groupChunksByTopic(chunks) {
    const topics = {};
    for (const chunk of chunks) {
        const topic = extractTopic(chunk.title, chunk.content);
        (topics[topic] = topics[topic] || []).push(chunk);
    }
    return topics;
}

export function fuseContext(chunks, reasoningChains, question) {
    try {
        let context = '# Thông tin chính:\n\n';
        const topicGroups = groupChunksByTopic(chunks);

        for (const [topic, topicChunks] of Object.entries(topicGroups)) {
            context += `## ${topic}:\n`;
            topicChunks.forEach((chunk, index) => {
                context += `### ${chunk.title || `Chunk ${index + 1}`}\n${chunk.content}\n\n`;
            });
        }

        if (reasoningChains?.length > 0) {
            context += '# Mối liên kết thông tin:\n\n';
            reasoningChains.forEach((chain, index) => {
                context += `## Liên kết ${index + 1}:\n`;
                context += `**Nguồn chính:** ${chain.source_chunk.title || 'Unknown'}\n`;
                context += `**Nội dung:** ${chain.source_chunk.content}\n\n`;
                if (chain.related_chunks?.length > 0) {
                    context += '**Thông tin liên quan:**\n';
                    chain.related_chunks.forEach(r => {
                        context += `- ${r.title || 'Unknown'}: ${r.content.substring(0, 200)}...\n`;
                    });
                    context += '\n';
                }
            });
        }

        return context;
    } catch (error) {
        console.error('❌ Error in fuseContext:', error);
        return chunks.map(c => `**${c.title}**: ${c.content}`).join('\n\n');
    }
}
