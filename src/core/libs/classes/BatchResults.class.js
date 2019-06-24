const SenderUpdate = require('./SenderUpdate.class');

const logger = require('../../../loggers/log4js');
const crypto = require('crypto');

function extractMetaData(message) {
  let messageMetaData;
  
  let headers = extractHeaders(message.payload.headers);
  
  if (headers !== undefined) {
    messageMetaData = {
      fromAddress: headers.fromAddress,
      fromName: headers.fromName,
      unsubscribeWeb: headers.unsubscribeWeb,
      unsubscribeEmail: headers.unsubscribeEmail,
    }
  }

  return messageMetaData; 
}


function extractHeaders(headers) {
  let fromAddress;
  let fromName;
  let unsubscribeEmail;
  let listUnsubscribeEmailType;
  let unsubscribeWeb;
  let extractedHeaders;

  let headerName = '';
  let headerValue = '';
  for (let header of headers) {
    headerName = header.name.toUpperCase();
    headerValue = header.value;
    if (headerName === 'FROM') {
      fromName = extractName(headerValue);
      fromAddress = extractAddress(headerValue);
      extractedHeaders = {
        fromAddress: fromAddress,
        fromName: fromName,
        unsubscribeEmail: unsubscribeEmail,
        unsubscribeWeb: unsubscribeWeb
      }
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
        unsubscribeWeb: unsubscribeWeb
      }
    }
  }
  if (extractedHeaders === undefined) {
    throw new Error('From or from not found in headers!');
  } else {
    // console.log(extractedHeaders);
    return extractedHeaders;
  }
}

function extractUnsubscribeEmail(unsubscribeEmail) {
  unsubscribeEmail = unsubscribeEmail.replace('<mailto:', '');
  unsubscribeEmail = unsubscribeEmail.replace('>', '');
  // console.log('EMAIL: ' + unsubscribeEmail);
  return unsubscribeEmail;
}

function extractUnsubscribeWeb(unsubscribeWeb) {
  unsubscribeWeb = unsubscribeWeb.replace('<', '');
  unsubscribeWeb = unsubscribeWeb.replace('>', '');
  // console.log('WEB: ' + unsubscribeWeb);
  return unsubscribeWeb;
}

function unsubscribeType(listUnsubscribe) {
  if (listUnsubscribe.includes('<mailto:')) {
    return true
  }
  return false;
}

function extractName(from) {
  from = from.replace(/"/g, '');
  let fromName;
  let endIndex = from.search(/<+/);
  let searchIndex = from.lastIndexOf('@');
  if (searchIndex === -1) {
    throw new Error('Error in From/from field, no "@" found');
  }
  if ((endIndex !== -1) && (endIndex !== 0)) {
    fromName = from.slice(0, endIndex).trim();
  } else if (endIndex === 0) {
    fromName = from.slice(1, searchIndex); // endIndex === 0 means from is likely of form <name@address.com>
  } else {
    fromName = from.slice(0, searchIndex);
  }

  if (fromName === undefined) {
    throw new Error('fromName undefined!')
  }
  return fromName;
}

/**
 * 
 * @param {string} from 
 */
function extractAddress(from) {
  let fromAddress;
  from = from.replace(/"/g, '');
  let startIndex = from.search(/<+/)
  let endIndex = from.search(/>+/);
  if ((startIndex !== -1) && (endIndex !== -1)) {
    fromAddress = from.slice(startIndex+1, endIndex);
  } else {
    let searchIndex = from.search('@');
    if (searchIndex === -1) {
      throw new Error('Error in From/from field, no "@" found');
    }
    fromAddress = from;
  }
  if (fromAddress === undefined) {
    throw new Error('fromAddress undefined!')
  }
  return fromAddress;
}

function createSenderId(senderAddress) {
  let md5sum = crypto.createHash('md5');
  md5sum.update(senderAddress);
  
  let id = md5sum.digest('hex');
  // this.senderId = id;
  return id;
}

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
  } catch(err) {
    logger.error(userId + ' - Error in message: ' + message.id + ': ' + err);
    return false;
  }
}
class BatchResults {

    constructor(userId) {
      this.senderUpdates = []; // an array of SenderUpdates (the results)
      this.messageUpdates = [];
      this.empty = true;
      this.userId = userId;
    }
  
    addToResults(message) {
      let ok = checkMessage(this.userId, message);
      if (ok) {
        let new_sender_update;
        let originatingSender = false;
        if ( message.threadId === message.id) {
          // originating thread message
          originatingSender = true;
        }

        new_sender_update = this.createSenderUpdate(message, originatingSender);
        if (new_sender_update != undefined) {
          this.addToSenderUpdates(new_sender_update);
        }

      }
    }

    createMessageUpdate(message) {

    }

    createSenderUpdate(message, originatingSender) {
      // let senderMessage = messages[0]
      try {
        let senderUpdate;
        let senderMetaData = extractMetaData(message);
        let senderId = createSenderId(senderMetaData.fromAddress);

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
            messageIdsOriginating: [], // implement later, with call to threadId perhaps
            totalSizeEstimate: message.sizeEstimate,
          }
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
            totalSizeEstimate: message.sizeEstimate
          }
        }
        let new_sender_update = new SenderUpdate(senderUpdate, this.userId);
        return new_sender_update;
      } catch(err) {
        logger.error(err);
        return undefined;
      }
    }

    addToSenderUpdates(new_sender_update) {
      let found = false;
      if (this.empty) {
        this.senderUpdates.push(new_sender_update);
        this.empty = false;
      } else {
        for (let i = 0; i < this.senderUpdates.length; i++) {
          let previous_suggestion = this.senderUpdates[i];
          if (previous_suggestion.senderId === new_sender_update.senderId) {
            previous_suggestion.mergeSenderUpdate(new_sender_update);
            found = true;
            break;
          }
        }
        if (!found) {
          this.senderUpdates.push(new_sender_update);
        }
      }
    }
  
    getResults() {
      return this.senderUpdates;
    }
  
  }

  module.exports = BatchResults;