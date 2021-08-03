
/**
 *  Temporary holding place for received gmail data about
 *  a sender in the Inbox. As the Inbox is scanned
 *  a particular sender (email address) that appears
 *  more than once is merged/concated into one data structure.
 *  before eventually getting upserted to MongoDB
 */
class SenderUpdate {
  /**
   * @param  {UpdateObject} update Mostly meta-data about a message
   * @param  {string} userId
   */
  constructor(update, userId) {
    this.userId = userId;
    this.senderId = update.senderId;
    this.senderAddress = update.senderAddress;
    this.senderNames = update.senderNames;
    this.unsubscribeEmail = update.unsubscribeEmail;
    this.unsubscribeWeb = update.unsubscribeWeb;
    this.threadIds = update.threadIds;
    this.threadIdsOriginating = update.threadIdsOriginating;
    this.messageIds = update.messageIds;
    this.messageIdsOriginating = update.messageIdsOriginating;
    this.messageCount = update.messageCount;
    this.totalSizeEstimate = update.totalSizeEstimate;
  }

  /**
   * @param  {Array<string>} messageIds
   */
  concatMessageIds(messageIds) {
    this.messageIds = this.messageIds.concat(messageIds);
  }

  /**
   * @param  {Array<string>} messageIdsOriginating
   */
  concatMessageIdsOriginating(messageIdsOriginating) {
    this.messageIdsOriginating =
      this.messageIdsOriginating.concat(messageIdsOriginating);
  }

  /**
   * @param  {string} name Name given by email sender
   */
  concatNames(name) {
    this.senderNames = this.senderNames.concat(name);
  }

  /**
   * @param  {Array<string>} threadIds
   */
  concatThreadIds(threadIds) {
    this.threadIds = this.threadIds.concat(threadIds);
  }

  /**
   * @param  {Array<string>} threadIdsOriginating
   */
  concatThreadIdsOriginating(threadIdsOriginating) {
    this.threadIdsOriginating =
      this.threadIdsOriginating.concat(threadIdsOriginating);
  }

  /**
   * @param  {number} totalSizeEstimate Size in bytes
   */
  addToTotalSizeEstimate(totalSizeEstimate) {
    this.totalSizeEstimate = this.totalSizeEstimate + totalSizeEstimate;
  }

  /**
   * newSenderUpdate.senderNames.length always = 1
   * @param  {SenderUpdate} newSenderUpdate
   */
  mergeSenderUpdate(newSenderUpdate) {
    let foundSameName = false;
    this.senderNames.forEach((name) => {
      if (name === newSenderUpdate.senderNames[0]) {
        foundSameName = true;
      }
    });
    if (!foundSameName) {
      this.concatNames(newSenderUpdate.senderNames[0]);
    }
    this.concatThreadIds(newSenderUpdate.threadIds);
    this.concatThreadIdsOriginating(newSenderUpdate.threadIdsOriginating);
    this.concatMessageIds(newSenderUpdate.messageIds);
    this.concatMessageIdsOriginating(newSenderUpdate.messageIdsOriginating);
    this.addToTotalSizeEstimate(newSenderUpdate.totalSizeEstimate);
  }
}

module.exports = SenderUpdate;
