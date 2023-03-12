module.exports = {
  // LOG_LEVEL: String(process.env.LOG_LEVEL || 'production'),
  MONGO_URI: String(process.env.MONGO_URI),
  GMAIL_BATCH_ENDPOINT: String(process.env.GMAIL_BATCH_ENDPOINT || 'https://www.googleapis.com/batch/gmail/v1'),
  // BATCH_MESSAGES_HEALTH_HOST: String(process.env.BATCH_MESSAGES_HEALTH_HOST),
  BATCH_MESSAGES_HEALTH_PORT: String(process.env.BATCH_MESSAGES_HEALTH_PORT),
  BATCH_SIZE: Number(process.env.GET_MESSAGES_BATCH_SIZE || 100),
  DEFAULT_PERCENT_LOADED: Number(process.env.DEFAULT_PERCENT_LOADED || 10),
};
