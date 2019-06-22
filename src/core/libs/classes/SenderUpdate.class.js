
class SenderUpdate {

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

  concatMessageIds(messageIds) {
    this.messageIds = this.messageIds.concat(messageIds);
  }

  concatMessageIdsOriginating(messageIdsOriginating) {
    this.messageIdsOriginating = this.messageIdsOriginating.concat(messageIdsOriginating);
  }

  concatNames(name) {
    this.senderNames = this.senderNames.concat(name);
  }

  concatThreadIds(threadIds) {
    this.threadIds = this.threadIds.concat(threadIds);
  }

  concatThreadIdsOriginating(threadIdsOriginating) {
    this.threadIdsOriginating = this.threadIdsOriginating.concat(threadIdsOriginating);
  }

  addToTotalSizeEstimate(totalSizeEstimate) {
    this.totalSizeEstimate = this.totalSizeEstimate + totalSizeEstimate;
  }

  // new_sender_update.senderNames.length always = 1
  mergeSenderUpdate(new_sender_update) {
    let found_same_name = false;
    this.senderNames.forEach((name) => {
      if (name === new_sender_update.senderNames[0]) {
        found_same_name = true;
      }
    });
    if (!found_same_name) {
      this.concatNames(new_sender_update.senderNames[0]);
    }
    this.concatThreadIds(new_sender_update.threadIds);
    this.concatThreadIdsOriginating(new_sender_update.threadIdsOriginating);
    this.concatMessageIds(new_sender_update.messageIds);
    this.concatMessageIdsOriginating(new_sender_update.messageIdsOriginating);
    this.addToTotalSizeEstimate(new_sender_update.totalSizeEstimate);
  }

}

module.exports = SenderUpdate;