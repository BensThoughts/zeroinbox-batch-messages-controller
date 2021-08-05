const logger = require('../../loggers/log4js');
const {
  findOneLoadingStatus,
  upsertLoadingStatus,
  upsertToHistory,
} = require('./mongoose.utils');

const {
  BATCH_SIZE,
  DEFAULT_PERCENT_LOADED,
} = require('../../config/init.config');

/**
 * @param  {string} userId
 * @param  {boolean} status
 */
function updateFirstRunStatus(userId, status) {
  const update = {
    'passive.firstRun': status,
  };
  upsertToHistory(userId, update, (err, raw) => {
    if (err) {
      return logger.error('Error in upsertToHistory: ' + err);
    }
    logger.trace('History: Passive: firstRun: false');
  });
}

/**
 * @param  {string} userId
 * @param  {boolean} status
 */
function updateLoadingStatus(userId, status) {
  const update = {
    'loadingStatus': status,
  };
  upsertLoadingStatus(userId, update, (err, raw) => {
    if (err) {
      return logger.error('Error in upsertLoadingStatus: ' + err);
    }
    logger.trace('LoadingStatus: loadingStatus set to false');
  });
}

/**
 * @param  {RabbitMsg} messageIdsMsg
 * @param  {number} batchPage
 */
function updatePercentLoaded(messageIdsMsg, batchPage) {
  const userId = messageIdsMsg.content.userId;
  let update;
  let percentTotalLoaded = DEFAULT_PERCENT_LOADED;
  findOneLoadingStatus(userId, (err, doc) => {
    if (doc !== null) {
      if (doc.messageIdTotal && doc.resultsPerPage) {
        const messageIdPage = messageIdsMsg.content.pageNumber;
        const messageIdTotal = doc.messageIdTotal;
        const totalNumberOfBatches = Math.ceil(messageIdTotal/BATCH_SIZE);
        const batchesPerPage = doc.resultsPerPage/BATCH_SIZE;
        const totalBatchNumber = (messageIdPage * batchesPerPage) + batchPage;
        const DECIMAL = 100;

        percentTotalLoaded = (totalBatchNumber/totalNumberOfBatches) * DECIMAL;
        percentTotalLoaded = Math.ceil(percentTotalLoaded);
      }
    }
    update = {
      'userId': userId,
      'percentLoaded': percentTotalLoaded,
    };

    upsertLoadingStatus(userId, update, (err, raw) => {
      if (err) {
        return logger.error('Error in updateLoadingStatus: ' + err);
      }
      logger.trace('History.active.percentLoaded: ' + percentTotalLoaded);
    });
  });
}

module.exports = {
  updatePercentLoaded,
  updateLoadingStatus,
  updateFirstRunStatus,
};
