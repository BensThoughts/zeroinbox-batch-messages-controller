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
    if(err) return logger.error(userId + ' - Error in History.updateOne: attempt to change firstRun to false ' + err);
    logger.trace(userId + ' - History: Passive: firstRun: false');
  })
}


function updateLoadingStatus(userId) {
    let update = {
      "loadingStatus": false,
    }
    upsertLoadingStatus(userId, update, (err, raw) => {
      if (err) return logger.error(userId + ' - Error in LoadingStatus.updateOne: attempt to change loadingStatus to false ' + err)
      logger.trace(userId + ' - LoadingStatus: loadingStatus set to false');
    });
  }
  
function updatePercentLoaded(messageIdsMsg, batchPage) {
    let userId = messageIdsMsg.content.userId;
    let update;
    let percentTotalLoaded = DEFAULT_PERCENT_LOADED;
    findOneLoadingStatus(userId, (err, doc) => {
      if (doc !== null) {
        if (doc.messageIdTotal && doc.resultsPerPage) {
          let messageIdPage = messageIdsMsg.content.pageNumber;
          let messageIdTotal = doc.messageIdTotal;
          let totalNumberOfBatches = Math.ceil(messageIdTotal/BATCH_SIZE);
          let batchesPerPage = doc.resultsPerPage/BATCH_SIZE;
          let totalBatchNumber = (messageIdPage * batchesPerPage) + batchPage;
          let DECIMAL = 100;
    
          percentTotalLoaded = (totalBatchNumber/totalNumberOfBatches) * DECIMAL;
          percentTotalLoaded = Math.ceil(percentTotalLoaded);
        }
      }
      update = {
        "userId": userId,
        "percentLoaded": percentTotalLoaded
      }

      upsertLoadingStatus(userId, update, (err, raw) => {
        if (err) return logger.error(userId + ' - Error in updatePercentLoaded() at History.updateOne: ' + err);
        logger.trace(userId + ' - History.active.percentLoaded: ' + percentTotalLoaded);
      });
    });
  }

  module.exports = {
      updatePercentLoaded,
      updateLoadingStatus,
      updateFirstRunStatus,
  }