import kafkaClient from './kafkaClient.js';

let _producer = null;

async function getProducer() {
  if (!_producer) {
    _producer = kafkaClient.producer();
    await _producer.connect();
    process.on('SIGTERM', async () => {
      await _producer?.disconnect();
    });
  }
  return _producer;
}

export async function publishMessage(topic, key, value) {
  const producer = await getProducer();
  await producer.send({
    topic,
    messages: [{ key: String(key), value: JSON.stringify(value) }],
  });
}
