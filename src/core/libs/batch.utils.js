const Batchelor = require('batchelor');
const logger = require('../../loggers/log4js');

const {
  GMAIL_BATCH_ENDPOINT,
} = require('../../config/init.config');

/**
 * An implementation of asyncForEach much like concatMap from rxjs.
 *
 * @param  {Array<Array<T>>}   array    An array of sub arrays
 * @param  {Function}          callback The callback function
 * @return {void}              does not return, is used internally as above
 */
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

/**
 *  Given an array, this function will return Array<Array<T>> where each
 *  subArray is of length subarraySize except for the last array which will
 *  be of length (array.length % subarraySize). Given an array with length
 *  less than subarraySize a new array of length 1 Array<Array<T>> with an inner
 *  array of length same as the starting array is returned.
 *
 *  Result should always start as the empty array [] but will become
 *  Array<Array<T>> as recursion happens.
 *
 * @param  {Array<T>} array        The array to be split;
 * @param  {Array<T>} result       The result as it currently exists;
 * @param {number} chunkLength     The length of a single chunk of Ids
 * @return {Array<Array<T>>}       The result after the last subArray is added;
 */
function chunkIds(array, result, chunkLength) {
  if (array.length <= chunkLength) {
    result = result.concat([array]);
    return result;
  }

  result = result.concat([array.slice(0, chunkLength)]);
  array = array.slice(chunkLength);

  return chunkIds(array, result, chunkLength);
}


/**
 * GAPI BATCH REQUEST TO GET EACH THREAD
 * https://developers.google.com/gmail/api/v1/reference/users/threads/get
 * https://github.com/wapisasa/batchelor
******************************************************************************/

/**
 * Create a new Batchelor Batch Request from one of the subArrays of threadIds.
 * creates the batch request with 'format=metadata'
 *
 * @param  {Array<string>} messageIdsChunk Array of messageIds
 * @param  {string} accessToken  The users google accessToken
 * @return {Promise}  The actual batch request to be executed
 */
function createBatchRequest(messageIdsChunk, accessToken) {
  const batch = new Batchelor({
    'uri': GMAIL_BATCH_ENDPOINT,
    'method': 'POST',
    'headers': {
      'Content-Type': 'multipart/mixed',
      'Authorization': 'Bearer ' + accessToken,
    },
  });

  const query = '?format=metadata ';

  messageIdsChunk.forEach((messageId) => {
    batch.add({
      'method': 'GET',
      'path': '/gmail/v1/users/me/messages/' + messageId + query,
    });
  });

  return new Promise((resolve, reject) => {
    batch.run((err, response) => {
      if (err) {
        logger.error('Error: ' + err);
        reject(err);
      } else {
        // results = results.concat([response]);
        resolve(response);
      }
    });
  });
}

module.exports = {
  asyncForEach,
  chunkIds,
  createBatchRequest,
};
