import { Kafka, logLevel } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'chatbot-app',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9094').split(','),
  logLevel: logLevel.WARN,
  connectionTimeout: 10000,
  requestTimeout: 60000, // > maxWaitTimeInMs để Fetch không bị timeout
  retry: {
    initialRetryTime: 300,
    retries: 12,
    maxRetryTime: 30000,
  },
});

export default kafka;
