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

function updateFirstRunStatus(userId) {
  let update = {
    "passive.firstRun": false
  }
  upsertToHistory(userId, update, (err, raw) => {
    if(err) return logger.error('Error in History.updateOne: attempt to change firstRun to false ' + err);
    logger.debug('History: Passive: firstRun: false: ' + userId);
  })
}


function updateLoadingStatus(userId) {
    let update = {
      "loadingStatus": false,
    }
    upsertLoadingStatus(userId, update, (err, raw) => {
      if (err) return logger.error('Error in LoadingStatus.updateOne: attempt to change loadingStatus to false ' + err)
      logger.debug('LoadingStatus: loadingStatus set to false');
    });
  }
  
function updatePercentLoaded(threadsMsg, batchPage) {
    let userId = threadsMsg.content.userId;
    let update;
    let percentTotalLoaded = DEFAULT_PERCENT_LOADED;
    findOneLoadingStatus(userId, (err, doc) => {
      if (doc !== null) {
        if (doc.threadIdCount && doc.resultsPerPage) {
          let threadIdPage = threadsMsg.content.pageNumber;
          let threadIdCount = doc.threadIdCount;
          let totalNumberOfBatches = Math.ceil(threadIdCount/BATCH_SIZE);
          let batchesPerPage = doc.resultsPerPage/BATCH_SIZE;
          let totalBatchNumber = (threadIdPage * batchesPerPage) + batchPage;
          let DECIMAL = 100;
    
          percentTotalLoaded = (totalBatchNumber/totalNumberOfBatches) * DECIMAL;
          percentTotalLoaded = Math.ceil(percentTotalLoaded);
        }
      }
      update = {
        "userId": threadsMsg.content.userId,
        "percentLoaded": percentTotalLoaded
      }

      upsertLoadingStatus(userId, update, (err, raw) => {
        if (err) {
          logger.error('Error in updatePercentLoaded() at History.updateOne: ' + err)
        } else {
          logger.debug('History: Active: percentLoaded: ' + percentTotalLoaded);
        }
      });
    });
  }

  module.exports = {
      updatePercentLoaded,
      updateLoadingStatus,
      updateFirstRunStatus,
  }