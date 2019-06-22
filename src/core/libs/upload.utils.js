const logger = require('../../loggers/log4js');
const { 
  upsertSenders,
} = require('./mongoose.utils');

  
  function uploadBatchResults(userId, senders) {
    upsertSenders(userId, senders, (err, raw) => {
      if (err) return logger.error('Error in uploadBatchResults() at upsertSenders(): ' + err);
      logger.debug('Senders inserted or updated');
    });
  }
  
  async function uploadBatchResultsSync(userId, senders) {
      await upsertSendersPromise(userId, senders).catch((err) => {
        logger.error('Error in uploadBatchResultsSync() at upsertSenders(): ' + err);
      });
      logger.debug('Sender inserted or updated');
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