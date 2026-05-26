export const TOPICS = {
  CHAT_REQUESTS: 'chat-requests',
  CHAT_RESPONSES: 'chat-responses',
  USAGE_EVENTS: 'usage-events',
  ANALYTICS_EVENTS: 'analytics-events',
};

export const TOPIC_CONFIG = {
  [TOPICS.CHAT_REQUESTS]:    { numPartitions: 3, replicationFactor: 1 },
  [TOPICS.CHAT_RESPONSES]:   { numPartitions: 3, replicationFactor: 1 },
  [TOPICS.USAGE_EVENTS]:     { numPartitions: 1, replicationFactor: 1 },
  [TOPICS.ANALYTICS_EVENTS]: { numPartitions: 1, replicationFactor: 1 },
};
