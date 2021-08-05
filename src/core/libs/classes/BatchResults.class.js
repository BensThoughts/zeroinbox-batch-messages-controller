const SenderUpdate = require('./SenderUpdate.class');

const logger = require('../../../loggers/log4js');
const crypto = require('crypto');

/**
 * @param  {GmailResponseMessage} message
 * @return {Object}
 */
function extractMetaData(message) {
  let messageMetaData;

  const headers = extractHeaders(message.payload.headers);

  if (headers !== undefined) {
    messageMetaData = {
      fromAddress: headers.fromAddress,
      fromName: headers.fromName,
      unsubscribeWeb: headers.unsubscribeWeb,
      unsubscribeEmail: headers.unsubscribeEmail,
    };
  }

  return messageMetaData;
}

/**
 * @param  {HttpHeaders} headers
 * @return {ExtractedHeaders}
 */
function extractHeaders(headers) {
  let fromAddress;
  let fromName;
  let unsubscribeEmail;
  let listUnsubscribeEmailType;
  let unsubscribeWeb;
  let extractedHeaders;

  let headerName = '';
  let headerValue = '';
  for (const header of headers) {
    headerName = header.name.toUpperCase();
    headerValue = header.value;
    if (headerName === 'FROM') {
      fromName = extractName(headerValue);
      fromAddress = extractAddress(headerValue);
      extractedHeaders = {
        fromAddress: fromAddress,
        fromName: fromName,
        unsubscribeEmail: unsubscribeEmail,
        unsubscribeWeb: unsubscribeWeb,
      };
    }
    if (headerName === 'LIST-UNSUBSCRIBE') {
      if (headerValue.search(',') !== -1) {
        headerValue = headerValue.split(',');
      } else {
        headerValue = [headerValue];
      }
      listUnsubscribeEmailType = unsubscribeType(headerValue[0]);
      // listUnsubscribeWebType = listUnsubscribeWebType(header.value);
      if (listUnsubscribeEmailType) {
        unsubscribeEmail = extractUnsubscribeEmail(headerValue[0]);
      } else {
        unsubscribeWeb = extractUnsubscribeWeb(headerValue[0]);
      }
      extractedHeaders = {
        fromAddress: fromAddress,
        fromName: fromName,
        unsubscribeEmail: unsubscribeEmail,
        unsubscribeWeb: unsubscribeWeb,
      };
    }
  }
  if (extractedHeaders === undefined) {
    throw new Error('From or from not found in headers!');
  } else {
    // console.log(extractedHeaders);
    return extractedHeaders;
  }
}

/**
 * @param  {string} unsubscribeEmail
 * @return {string}
 */
function extractUnsubscribeEmail(unsubscribeEmail) {
  unsubscribeEmail = unsubscribeEmail.replace('<mailto:', '');
  unsubscribeEmail = unsubscribeEmail.replace('>', '');
  // console.log('EMAIL: ' + unsubscribeEmail);
  return unsubscribeEmail;
}

/**
 * @param  {string} unsubscribeWeb
 * @return {string}
 */
function extractUnsubscribeWeb(unsubscribeWeb) {
  unsubscribeWeb = unsubscribeWeb.replace('<', '');
  unsubscribeWeb = unsubscribeWeb.replace('>', '');
  // console.log('WEB: ' + unsubscribeWeb);
  return unsubscribeWeb;
}

/**
 * @param  {string} listUnsubscribe
 * @return {string}
 */
function unsubscribeType(listUnsubscribe) {
  if (listUnsubscribe.includes('<mailto:')) {
    return true;
  }
  return false;
}

/**
 * @param  {string} from
 * @return {string}
 */
function extractName(from) {
  from = from.replace(/"/g, '');
  let fromName;
  const endIndex = from.search(/<+/);
  const searchIndex = from.lastIndexOf('@');
  if (searchIndex === -1) {
    throw new Error('Error in From/from field, no "@" found');
  }
  if ((endIndex !== -1) && (endIndex !== 0)) {
    fromName = from.slice(0, endIndex).trim();
  } else if (endIndex === 0) {
    // endIndex === 0 means from is likely of form <name@address.com>
    fromName = from.slice(1, searchIndex);
  } else {
    fromName = from.slice(0, searchIndex);
  }

  if (fromName === undefined) {
    throw new Error('fromName undefined!');
  }
  return fromName;
}

/**
 * @param {string} from
 * @return {string}
 */
function extractAddress(from) {
  let fromAddress;
  from = from.replace(/"/g, '');
  const startIndex = from.search(/<+/);
  const endIndex = from.search(/>+/);
  if ((startIndex !== -1) && (endIndex !== -1)) {
    fromAddress = from.slice(startIndex+1, endIndex);
  } else {
    const searchIndex = from.search('@');
    if (searchIndex === -1) {
      throw new Error('Error in From/from field, no "@" found');
    }
    fromAddress = from;
  }
  if (fromAddress === undefined) {
    throw new Error('fromAddress undefined!');
  }
  return fromAddress;
}

/**
 * @param  {string} senderAddress
 * @return {string} id is an md5sum of email (senderAddress)
 */
function createSenderId(senderAddress) {
  const md5sum = crypto.createHash('md5');
  md5sum.update(senderAddress);

  const id = md5sum.digest('hex');
  // this.senderId = id;
  return id;
}
/**
 * @param  {string} userId
 * @param  {GmailMessage} message
 * @return {boolean}
 */
function checkMessage(userId, message) {
  try {
    if (message.threadId === undefined) {
      throw new Error('message.threadId undefined!');
    }
    if (message.internalDate === undefined) {
      throw new Error('message.internalDate undefined!');
    }
    // if (message.labelIds === undefined) {
    //  throw new Error('message.labelIds undefined!');
    // }
    if (message.sizeEstimate === undefined) {
      throw new Error('message.sizeEstimate undefined!');
    }
    if (message.payload === undefined) {
      throw new Error('message.payload undefined!');
    }
    if (message.payload.headers === undefined) {
      throw new Error('message.payload.headers undefined!');
    }
    return true;
  } catch (err) {
    logger.error('Error in message: ' + message.id + ': ' + err);
    return false;
  }
}

/** Class representing gmail batch results of getting meta-data */
class BatchResults {
  /**
   * @param  {string} userId
   */
  constructor(userId) {
    // an array of Sender email address Updates (the results)
    this.senderUpdates = [];
    // an array of email messages currently in Inbox
    this.messageUpdates = [];
    this.empty = true;
    this.userId = userId;
  }

  /**
   * @param  {GmailEmailMessage} message
   */
  addToResults(message) {
    const ok = checkMessage(this.userId, message);
    if (ok) {
      let originatingSender = false;
      if ( message.threadId === message.id) {
        // sender started the thread (first message in thread)
        originatingSender = true;
      }

      const newSenderUpdate =
        this._createSenderUpdate(message, originatingSender);
      if (newSenderUpdate != undefined) {
        this._addToSenderUpdates(newSenderUpdate);
      }
    }
  }

  /**
   * @param  {GmailEmailMessage} message
   * @param  {string} originatingSender
   * @return {SenderUpdate}
   */
  _createSenderUpdate(message, originatingSender) {
    // let senderMessage = messages[0]
    try {
      let senderUpdate;
      const senderMetaData = extractMetaData(message);
      const senderId = createSenderId(senderMetaData.fromAddress);

      if (originatingSender) {
        senderUpdate = {
          senderId: senderId,
          senderNames: [senderMetaData.fromName],
          senderAddress: senderMetaData.fromAddress,
          unsubscribeEmail: senderMetaData.unsubscribeEmail,
          unsubscribeWeb: senderMetaData.unsubscribeWeb,
          threadIds: [message.threadId],
          threadIdsOriginating: [message.threadId],
          messageIds: [message.id],

          // implement later, with call to threadId perhaps
          messageIdsOriginating: [],
          totalSizeEstimate: message.sizeEstimate,
        };
      } else {
        senderUpdate = {
          senderId: senderId,
          senderNames: [senderMetaData.fromName],
          senderAddress: senderMetaData.fromAddress,
          unsubscribeEmail: senderMetaData.unsubscribeEmail,
          unsubscribeWeb: senderMetaData.unsubscribeWeb,
          threadIds: [message.threadId],
          threadIdsOriginating: [],
          messageIds: [message.id],
          messageIdsOriginating: [],
          totalSizeEstimate: message.sizeEstimate,
        };
      }
      const newSenderUpdate = new SenderUpdate(senderUpdate, this.userId);
      return newSenderUpdate;
    } catch (err) {
      logger.error(err);
      return undefined;
    }
  }

  /**
   * @param  {SenderUpdate} newSenderUpdate
   */
  _addToSenderUpdates(newSenderUpdate) {
    let found = false;
    if (this.empty) {
      this.senderUpdates.push(newSenderUpdate);
      this.empty = false;
    } else {
      for (let i = 0; i < this.senderUpdates.length; i++) {
        const previousSuggestion = this.senderUpdates[i];
        if (previousSuggestion.senderId === newSenderUpdate.senderId) {
          previousSuggestion.mergeSenderUpdate(newSenderUpdate);
          found = true;
          break;
        }
      }
      if (!found) {
        this.senderUpdates.push(newSenderUpdate);
      }
    }
  }
  /**
   * @return {Array<SenderUpdate>}
   */
  getResults() {
    return this.senderUpdates;
  }
}

module.exports = BatchResults;
