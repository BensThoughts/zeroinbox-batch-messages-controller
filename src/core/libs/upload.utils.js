const logger = require('../../loggers/log4js');
const { 
  upsertSenders,
} = require('./mongoose.utils');

  
  function uploadBatchResults(userId, senders) {
    upsertSenders(userId, senders, (err, raw) => {
      if (err) return logger.error(userId + ' - Error in uploadBatchResults() at upsertSenders(): ' + err);
      logger.trace(userId + ' - Senders updated in mongo async!');
    });
  }
  
  async function uploadBatchResultsSync(userId, senders) {
      await upsertSendersPromise(userId, senders).catch((err) => {
        logger.error(userId + ' - Error in uploadBatchResultsSync() at upsertSenders(): ' + err);
      });
      logger.debug(userId + ' - Senders updated in mongo synchronously!');
  }
  
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
    uploadBatchResultsSync
};