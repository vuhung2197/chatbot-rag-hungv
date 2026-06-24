import kafkaClient from './kafkaClient.js';
import { TOPIC_CONFIG } from './topics.js';

export async function ensureTopics() {
  const admin = kafkaClient.admin();
  await admin.connect();
  try {
    const existing = await admin.listTopics();
    const toCreate = Object.entries(TOPIC_CONFIG)
      .filter(([topic]) => !existing.includes(topic))
      .map(([topic, cfg]) => ({ topic, ...cfg }));

    if (toCreate.length > 0) {
      await admin.createTopics({ topics: toCreate });
      console.log('✅ Kafka topics created:', toCreate.map((t) => t.topic).join(', '));
    } else {
      console.log('✅ Kafka topics already exist');
    }
  } finally {
    await admin.disconnect();
  }
}
