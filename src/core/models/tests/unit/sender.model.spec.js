const dotenv = require('dotenv').config();

if (dotenv.error) {
  throw dotenv.error;
}

const expect = require('chai').expect;
const crypto = require('crypto');

const Sender = require('../../sender.model');

const createSenderId = function(senderAddress) {
  const md5sum = crypto.createHash('md5');
  md5sum.update(senderAddress);

  const id = md5sum.digest('hex');
  // this.senderId = id;
  return id;
};

const validSuggestion = function() {
  const senderId = Sender.createSenderId('senderAddress');
  return new Sender({
    userId: 'userId',
    emailAddress: 'emailAddress',
    emailId: 'emailId',
    senderId: senderId,
    senderNames: ['fromName'],
    senderAddress: 'senderAddress',
    threadIds_internalDates: [{threadId: 'threadId', internalDate: 123456}],
    totalSizeEstimate: 123456,
  });
};

const senderId = createSenderId('senderAddress');

describe('models: sender', function() {
  it('should be invalid if new Sender() is empty', function(done) {
    const suggestion = new Sender();

    suggestion.validate(function(err) {
      expect(err.errors).to.exist;
      done();
    });
  });
  it('should be invalid if new Sender() is missing userId', (done) => {
    const suggestion = new Sender({
      // userId: 'userId',
      senderId: senderId,
      senderNames: ['fromNames'],
      senderAddress: 'senderAddress',
      threadIds_internalDates: [{threadId: 'threadId', internalDate: 123456}],
      totalSizeEstimate: 123456,
    });
    suggestion.validate((err) => {
      expect(err.errors).to.exist;
      done();
    });
  });
  it('should be invalid if new Sender() is missing senderId', (done) => {
    const suggestion = new Sender({
      userId: 'userId',
      // senderId: 'senderId',
      senderNames: ['fromNames'],
      senderAddress: 'senderAddress',
      threadIds_internalDates: [{threadId: 'threadId', internalDate: 123456}],
      totalSizeEstimate: 123456,
    });
    suggestion.validate((err) => {
      expect(err.errors).to.exist;
      done();
    });
  });
  it('should be invalid if new Sender() is missing senderNames', (done) => {
    const suggestion = new Sender({
      userId: 'userId',
      senderId: senderId,
      // senderNames: ['fromNames'],
      senderAddress: 'senderAddress',
      threadIds_internalDates: [{threadId: 'threadId', internalDate: 123456}],
      totalSizeEstimate: 123456,
    });
    suggestion.validate((err) => {
      expect(err.errors).to.exist;
      done();
    });
  });
  it('should be invalid if new Sender() is missing senderAddress', (done) => {
    const suggestion = new Sender({
      userId: 'userId',
      senderId: senderId,
      senderNames: ['fromNames'],
      // senderAddress: 'senderAddress',
      threadIds_internalDates: [{threadId: 'threadId', internalDate: 123456}],
      totalSizeEstimate: 123456,
    });
    suggestion.validate((err) => {
      expect(err.errors).to.exist;
      done();
    });
  });
  it('should be invalid if Sender is missing threadIds_internalDates',
      (done) => {
        const suggestion = new Sender({
          userId: 'userId',
          senderId: senderId,
          senderNames: ['fromNames'],
          senderAddress: 'senderAddress',
          // threadIds_internalDates
          totalSizeEstimate: 123456,
        });
        suggestion.validate((err) => {
          expect(err.errors).to.exist;
          done();
        });
      },
  );
  it('should be invalid if new Sender() is missing totalSizeEstimate',
      (done) => {
        const suggestion = new Sender({
          userId: 'userId',
          senderId: senderId,
          senderNames: ['fromNames'],
          senderAddress: 'senderAddress',
          threadIds_internalDates: [
            {threadId: 'threadId', internalDate: 123456},
          ],
          // totalSizeEstimate: 123456,
        });
        suggestion.validate((err) => {
          expect(err.errors).to.exist;
          done();
        });
      },
  );
  it('should be invalid if new Sender() is missing count', (done) => {
    const suggestion = new Sender({
      userId: 'userId',
      senderId: senderId,
      senderNames: ['fromNames'],
      senderAddress: 'senderAddress',
      threadIds_internalDates: [{threadId: 'threadId', internalDate: 123456}],
      totalSizeEstimate: 123456,
    });
    suggestion.validate((err) => {
      expect(err.errors).to.exist;
      done();
    });
  });
  it('should be valid if new Sender() has all required properties',
      function(done) {
        const suggestion = validSuggestion();
        suggestion.validate(function(err) {
          expect(err).not.to.exist;
          done();
        });
      },
  );

  describe('static methods:', () => {
    it('should have createSenderId', () => {
      // const suggestion = validSuggestion();
      expect(Sender).to.have.property('createSenderId');
    });
    it('createSenderId should create id as md5 hash in hex decimal', () => {
      const suggestion = validSuggestion();
      const id = createSenderId('senderAddress');
      expect(suggestion.senderId).to.eql(id);
    });
  });
});
