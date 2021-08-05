
const logger = require('../loggers/log4js');
const rabbit = require('zero-rabbit');

/**
 * BATCHELOR INIT
******************/
const BatchResults = require('./libs/classes/BatchResults.class');

const {
  asyncForEach,
  chunkIds,
  createBatchRequest,
} = require('./libs/batch.utils');

const {
  uploadBatchResults,
  uploadBatchResultsSync,
} = require('./libs/upload.utils');

const {
  updateLoadingStatus,
  updatePercentLoaded,
  updateFirstRunStatus,
} = require('./libs/loading-status.utils');

const {
  userTopology,
} = require('../config/rabbit.config');

const {
  BATCH_SIZE,
} = require('../config/init.config');

/**
 * Checks if the response is valid (some emails have invalid properties)
 * @param  {string} userId
 * @param  {Object} partBatchResponse {
 *  body: The 'message' part of the payload
 *  id: The message id payload
 * }
 * @return {boolean}
 */
function checkPartBatchResponse(userId, partBatchResponse) {
  try {
    if (partBatchResponse === undefined) {
      throw new Error('partBatchResponse undefined!');
    }
    if (partBatchResponse.body === undefined) {
      throw new Error(
          '(message undefined!): ' + JSON.stringify(partBatchResponse),
      );
    };
    if (partBatchResponse.body.id === undefined) {
      throw new Error(
          '(message.id undefined!): ' + JSON.stringify(partBatchResponse.body),
      );
    }
    return true;
  } catch (err) {
    logger.error('Error in partBatchResponse: ' + err);
    return false;
  }
}

/**
 * @param  {RabbitMsg} messageIdsMsg Holds the messageIds to run job on
 * @param  {RabbitMsg} userMsg Holds the message asking to run the job
 */
async function batchGetMessages(messageIdsMsg, userMsg) {
  const userId = messageIdsMsg.content.userId;
  const accessToken = messageIdsMsg.content.accessToken;
  const messageIds = messageIdsMsg.content.messageIds;

  // pre-empt batching when there are no new messageIds (messageIds = []);
  if (messageIds.length <= 0) {
    const lastMsg = messageIdsMsg.content.lastMsg;
    if (!lastMsg) {
      ackMessages(messageIdsMsg, userMsg);
    } else {
      updateFirstRunStatus(userId, false);
      updateLoadingStatus(userId, false);
      ackMessages(messageIdsMsg, userMsg);
    }
    return;
  } else {
    const startBatchProccess = async () => {
      const batchResults = new BatchResults(userId);
      const messageIdChunks = chunkIds(messageIds, [], BATCH_SIZE);
      let batchPage = 1;
      let date;

      await asyncForEach(messageIdChunks, async (messageIdChunk) => {
        const batchResult =
          await createBatchRequest(messageIdChunk, accessToken)
              .catch((err) => {
                logger.error('GMAIL BATCH REQUEST ERROR: ' + err);
              });

        // profiling purposes
        date = new Date();
        logger.trace(
            'Batch ' + batchPage + ' done: ' + date.getSeconds() + 's',
        );

        updatePercentLoaded(messageIdsMsg, batchPage);
        batchPage++;

        if (batchResult.parts !== undefined) {
          batchResult.parts.forEach((partBatchResponse) => {
            const ok = checkPartBatchResponse(userId, partBatchResponse);
            if (ok) {
              // message is a GmailEmailMessage
              const message = partBatchResponse.body;
              batchResults.addToResults(message);
            }
          });
        } else {
          logger.error('result.parts was undefined!');
        }
      });

      const senders = batchResults.getResults();
      const lastMsg = messageIdsMsg.content.lastMsg;
      if (!lastMsg) {
        uploadBatchResults(userId, senders);
        ackMessages(messageIdsMsg, userMsg);
      } else {
        await uploadBatchResultsSync(userId, senders);
        // change loading status & ack(threadsMsg) after the upserts are done
        // rabbit.ack(threadsMsg);
        // setLoadingToFalse(userId);
        updateFirstRunStatus(userId, false);
        updateLoadingStatus(userId, false);
        ackMessages(messageIdsMsg, userMsg);
      }
      logger.trace('BATCH FINISHED!');
    };

    startBatchProccess().catch((error) => {
      logger.error(error);
    });
  }
}

/**
 * @param  {RabbitMsg} messageIdsMsg
 * @param  {RabbitMsg} userMsg
 */
function ackMessages(messageIdsMsg, userMsg) {
  const userId = userMsg.content.userId;
  const lastMsg = messageIdsMsg.content.lastMsg;
  const userChannel = userTopology.channels.user_prefix + userId;

  if (!lastMsg) {
    rabbit.ack(userChannel, messageIdsMsg);
  } else {
    // change loading status and ack(threadsMsg) only after the upserts are done
    // rabbit.ack(threadsMsg);
    // setLoadingToFalse(userId);
    rabbit.ack(userChannel, messageIdsMsg);
    const messageIdsQueue = userTopology.queues.user_prefix + userId;
    rabbit.deleteQueue(userChannel, messageIdsQueue, {}, (err, ok) => {
      rabbit.cancelChannel(userChannel);
      rabbit.closeChannel(userChannel);
    });

    // The only point of userMsg in this whole function is so that if the
    // process dies another batch service can grab the userMsg from
    // batch.user.id.q.1' and continue working on the users messages.q until
    // all of the batches are complete. So on the lastMsg we ack the userMsg.
    rabbit.ack(userTopology.channels.listen, userMsg);
  }
}

module.exports = batchGetMessages;


