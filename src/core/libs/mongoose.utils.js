const History = require('../models/history.model');
const Sender = require('../models/sender.model');
const LoadingStatus = require('../models/loading.model');

// const logger = require('../../loggers/log4js');

exports.upsertToHistory = function(userId, update, callback) {
  const conditions = {userId: userId};
  const options = {
    upsert: true,
    multi: false,
  };
  History.updateOne(conditions, update, options, (err, raw) => {
    callback(err, raw);
  });
};

exports.upsertLoadingStatus = function(userId, update, callback) {
  const conditions = {userId: userId};
  const options = {
    upsert: true,
    multi: false,
  };
  LoadingStatus.updateOne(conditions, update, options, (err, raw) => {
    callback(err, raw);
  });
};

exports.findOneLoadingStatus = function(userId, callback) {
  const conditions = {userId: userId};
  LoadingStatus.findOne(conditions, (err, doc) => {
    callback(err, doc);
  });
};

/**
 * Used to clean data for upsert to MongoDB
 * @param  {Sender} sender
 * @return {MongoUpdate}
 */
function createSenderUpdate(sender) {
  const update = {
    '$set': {
      userId: sender.userId,
      senderId: sender.senderId,
      senderAddress: sender.senderAddress,
      unsubscribeEmail: sender.unsubscribeEmail,
      unsubscribeWeb: sender.unsubscribeWeb,
      unsubscribed: false, // if a new thread exists they are not subscribed
    },
    '$inc': {
      totalSizeEstimate: sender.totalSizeEstimate,
    },
    // '$push': {
    // threadIds_internalDates: sender.threadIds_internalDates,
    // },
    '$addToSet': {
      threadIds: sender.threadIds,
      threadIdsOriginating: sender.threadIdsOriginating,
      senderNames: sender.senderNames,
      messageIds: sender.messageIds,
      messageIdsOriginating: sender.messageIdsOriginating,
    },
  };

  return update;
}

exports.upsertSenders = function(userId, senders, callback) {
  const bulkWrites = senders.map((sender) => {
    const update = createSenderUpdate(sender);
    return {
      updateOne: {
        filter: {
          userId: userId,
          senderId: sender.senderId,
        },
        upsert: true,
        update: update,
      },
    };
  });
  Sender.bulkWrite(bulkWrites, (err, res) => {
    callback(err, res);
  });
};
