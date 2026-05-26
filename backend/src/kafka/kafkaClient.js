import { Kafka, logLevel } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'chatbot-app',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9094').split(','),
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

export default kafka;
