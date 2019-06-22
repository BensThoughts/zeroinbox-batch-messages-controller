module.exports = {
    log_level: String(process.env.LOG_LEVEL) || 'production',
    mongo_uri: String(process.env.MONGO_URI),
    GMAIL_BATCH_ENDPOINT: String(process.env.GMAIL_BATCH_ENDPOINT) || 'https://www.googleapis.com/batch/gmail/v1',
    batch_messages_health_host: String(process.env.BATCH_MESSAGES_HEALTH_HOST),
    batch_messages_health_port: String(process.env.BATCH_MESSAGES_HEALTH_PORT),
    BATCH_SIZE: Number(process.env.GET_MESSAGES_BATCH_SIZE) || 100,
    DEFAULT_PERCENT_LOADED: Number(process.env.DEFAULT_PERCENT_LOADED) || 10
}