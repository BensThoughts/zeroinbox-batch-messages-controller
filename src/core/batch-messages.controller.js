
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

function checkPartBatchResponse(part_batch_response) {
  try {
    if (part_batch_response.body === undefined) {
      throw new Error('part_batch_response.body undefined!');
    };
    if (part_batch_response.body.messages === undefined) {
      throw new Error('part_batch_response.body.messages undefined!');
    }
    return true;
  } catch(err) {
    logger.error('Error in part_batch_response: ' + err);
    return false;
  }
}

async function batchGetMessages(messageIdsMsg, userMsg) {

  let userId = threadsMsg.content.userId;
  let access_token = threadsMsg.content.access_token;
  let messageIds = messageIdsMsg.content.messageIds;

  if (messageIds.length <= 0) {
    ackMessages(userId, messageIdsMsg, userMsg);
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
            let ok = checkPartBatchResponse(part_batch_response);
            if (ok) { 
                batchResults.addToResults(part_batch_response.body.messages);
            }
          });

        } else {
          logger.error('result.parts was undefined!');
        }
      });

      let senders = batchResults.getResults();
      if (!threadsMsg.content.lastMsg) {
        uploadBatchResults(userId, senders);
        ackMessages(userId, threadsMsg, userMsg);
      } else {
        await uploadBatchResultsSync(userId, senders);
        logger.debug('UPLOADED');
        // change loading status and ack(threadsMsg) only after the upserts are done
        // rabbit.ack(threadsMsg);
        // setLoadingToFalse(userId);
        ackMessages(userId, threadsMsg, userMsg);
      }
      logger.debug('BATCH FINISHED!')
    }

    startBatchProccess().catch((error) => {
      logger.error(error);
    });
  }
}

function ackMessages(messageIdsMsg, userMsg) {
  let userId = userMsg.content.userId;
  let lastMsg = messageIdsMsg.content.lastMsg;
  if (!lastMsg) {
    rabbit.ack(rabbit_topology.channels.user_prefix + userId, messageIdsMsg);
  } else {
    // change loading status and ack(threadsMsg) only after the upserts are done
    // rabbit.ack(threadsMsg);
    // setLoadingToFalse(userId);
    updateFirstRunStatus(userId);
    updateLoadingStatus(userId);

    rabbit.ack(rabbit_topology.channels.user_prefix + userId, messageIdsMsg);

    // The only point of userMsg in this whole function is so that if the process
    // dies another batch service can grab the userMsg from 'batch.user.id.q.1' and
    // continue working on the users threads.q until all of the batches are complete.
    // so on the lastMsg we ack the userMsg.
    rabbit.ack(rabbit_topology.channels.listen[0], userMsg);

    rabbit.deleteQueue(rabbit_topology.channels.user_prefix + userId, rabbit_topology.queues.user_prefix + userId, {}, (err, ok) => {
      rabbit.cancelChannel(rabbit_topology.channels.user_prefix + userId);
      rabbit.closeChannel(rabbit_topology.channels.user_prefix + userId);
    });

  }
}

module.exports = batchGetMessages;



