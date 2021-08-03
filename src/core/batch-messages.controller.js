
const logger = require('../loggers/log4js');
const rabbit = require('zero-rabbit');

/*******************************************************************************
 BATCHELOR INIT
*******************************************************************************/
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
  rabbit_topology
} = require('../config/rabbit.config');

const {
  BATCH_SIZE
} = require('../config/init.config');

function checkPartBatchResponse(userId, part_batch_response) {
  try {
    if (part_batch_response === undefined) {
      throw new Error('part_batch_response undefined!');
    }
    if (part_batch_response.body === undefined) {
      logger.info(JSON.stringify(part_batch_response));
      throw new Error('part_batch_response.body undefined! (message undefined!)');
    };
    if (part_batch_response.body.id === undefined) {
      logger.info(JSON.stringify(part_batch_response.body));
      throw new Error('part_batch_response.body.id undefined! (message.id undefined!)');
    }
    return true;
  } catch(err) {
    logger.error(userId + ' - Error in part_batch_response: ' + err);
    return false;
  }
}

async function batchGetMessages(messageIdsMsg, userMsg) {

  let userId = messageIdsMsg.content.userId;
  let access_token = messageIdsMsg.content.access_token;
  let messageIds = messageIdsMsg.content.messageIds;

  if (messageIds.length <= 0) { // pre-empt batching when there are no new messageIds (messageIds = []);
    let lastMsg = messageIdsMsg.content.lastMsg;
    if (!lastMsg) {
      ackMessages(messageIdsMsg, userMsg);
    } else {
      updateFirstRunStatus(userId);
      updateLoadingStatus(userId);
      ackMessages(messageIdsMsg, userMsg);
    }
    return;
  } else {
    const startBatchProccess = async () => {

      let batchResults = new BatchResults(userId);
      let messageIdChunks = chunkIds(messageIds, [], BATCH_SIZE);
      let batchPage = 1;
      let date;

      await asyncForEach(messageIdChunks, async (messageIdChunk) => {            
        let batchResult = await createBatchRequest(messageIdChunk, access_token).catch((err) => {
          logger.error('GMAIL BATCH REQUEST ERROR: ' + err);
        });

        // profiling purposes
        date = new Date();
        logger.trace(userId + ' - Batch response ' + batchPage + ' done: ' + date.getSeconds() + '.' + date.getMilliseconds() + 's');

        updatePercentLoaded(messageIdsMsg, batchPage);
        batchPage++;
       
        if (batchResult.parts !== undefined) {

          batchResult.parts.forEach((part_batch_response) => {
            let ok = checkPartBatchResponse(userId, part_batch_response);
            if (ok) {
              let message = part_batch_response.body;
              batchResults.addToResults(message);
            }
          });

        } else {
          logger.error('result.parts was undefined!');
        }
      });

      let senders = batchResults.getResults();
      let lastMsg = messageIdsMsg.content.lastMsg;
      if (!lastMsg) {
        uploadBatchResults(userId, senders);
        ackMessages(messageIdsMsg, userMsg);
      } else {
        await uploadBatchResultsSync(userId, senders);
        // change loading status and ack(threadsMsg) only after the upserts are done
        // rabbit.ack(threadsMsg);
        // setLoadingToFalse(userId);
        updateFirstRunStatus(userId);
        updateLoadingStatus(userId);
        ackMessages(messageIdsMsg, userMsg);
      }
      logger.trace(userId + ' - BATCH FINISHED!')
    }

    startBatchProccess().catch((error) => {
      logger.error(error);
    });
  }
}

function ackMessages(messageIdsMsg, userMsg) {
  let userId = userMsg.content.userId;
  let lastMsg = messageIdsMsg.content.lastMsg;
  let userChannel = rabbit_topology.channels.user_prefix + userId;

  if (!lastMsg) {
    rabbit.ack(userChannel, messageIdsMsg);
  } else {
    // change loading status and ack(threadsMsg) only after the upserts are done
    // rabbit.ack(threadsMsg);
    // setLoadingToFalse(userId);
    rabbit.ack(userChannel, messageIdsMsg);
    let messageIdsQueue = rabbit_topology.queues.user_prefix + userId;
    rabbit.deleteQueue(userChannel, messageIdsQueue, {}, (err, ok) => {
      rabbit.cancelChannel(userChannel);
      rabbit.closeChannel(userChannel);
    });

    // The only point of userMsg in this whole function is so that if the process
    // dies another batch service can grab the userMsg from 'batch.user.id.q.1' and
    // continue working on the users threads.q until all of the batches are complete.
    // so on the lastMsg we ack the userMsg.
    rabbit.ack(rabbit_topology.channels.listen, userMsg);
  }
}

module.exports = batchGetMessages;



