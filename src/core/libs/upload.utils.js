const logger = require('../../loggers/log4js');
const {
  upsertSenders,
} = require('./mongoose.utils');

/**
 * This function is called and then left to upsert whenever it does (async)
 * @param  {string} userId
 * @param  {Array<Senders>} senders
 */
function uploadBatchResults(userId, senders) {
  upsertSenders(userId, senders, (err, raw) => {
    if (err) {
      return logger.error('Error in upsertSenders(): ' + err);
    }
    logger.trace('Senders updated in mongo async!');
  });
}

/**
 * This function is called and waits for upsert to ensure synchronous operation
 * @param  {string} userId
 * @param  {Array<Sender>} senders
 */
async function uploadBatchResultsSync(userId, senders) {
  await upsertSendersPromise(userId, senders).catch((err) => {
    logger.error('Error in upsertSenders(): ' + err);
  });
  logger.trace('Senders updated in mongo synchronously!');
}

/**
 * Helper function to upsert senders with await above
 * @param  {string} userId
 * @param  {Array<Sender>} senders
 * @return {Promise}
 */
function upsertSendersPromise(userId, senders) {
  return new Promise((resolve, reject) => {
    upsertSenders(userId, senders, (err, raw) => {
      if (err) {
        reject(err);
      }
      resolve(raw);
    });
  });
}

module.exports = {
  uploadBatchResults,
  uploadBatchResultsSync,
};
