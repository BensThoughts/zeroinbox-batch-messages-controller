/**
 * MONGODB INIT
 ****************************************************************************/
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const crypto = require('crypto');

const headerScheme = new Schema({
  name: {type: String, required: true},
  value: {type: String, required: true},
});

const messageSchema = new Schema({
  userId: {type: String, required: true},
  senderId: {type: String, required: true},
  messageId: {type: String, required: true},
  threadId: {type: String, required: true},
  labelIds: {type: [String], required: true},
  snippet: {type: String, required: true},
  historyId: {type: String, required: true},
  internalDate: {type: String, required: true},
  headers: {type: [headerScheme], required: true},
  sizeEstimate: {type: Number, required: true},
});

senderSchema.statics.createSenderId = function(senderAddress) {
  const md5sum = crypto.createHash('md5');
  md5sum.update(senderAddress);

  const id = md5sum.digest('hex');
  // this.senderId = id;
  return id;
};

const Message = mongoose.model('messages', messageSchema);


module.exports = Message;
