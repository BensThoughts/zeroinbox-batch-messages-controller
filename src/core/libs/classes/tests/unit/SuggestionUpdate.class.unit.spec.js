var expect = require('chai').expect;
const SuggestionUpdate = require('../../SuggestionUpdate.class');

let userId = 'userId';
let userId2 = 'userId2';

let update = {
    senderId: 'senderId',
    senderAddress: 'senderAddress',
    senderNames: ['senderName1', 'senderName2'],
    threadIds_internalDates: [
        { threadId: '123abc', internalDate: 12345 },
        { threadId: '456def', internalDate: 54321 }
    ],
    totalSizeEstimate: 12345
}

let update2 = {
    senderId: 'senderId2',
    senderAddress: 'senderAddress2',
    senderNames: ['senderName3', 'senderName4'],
    threadIds_internalDates: [
        { threadId: '123abc', internalDate: 12345 },
        { threadId: '456def', internalDate: 54321 }
    ],
    totalSizeEstimate: 54321
}

let suggestionUpdate = function(update, userId) {
    return new SuggestionUpdate(update, userId);
}

describe('class: SuggestionUpdate', () => {
    it('should contain a userId when created', () => {
        let suggestion = suggestionUpdate(update, userId);
        expect(suggestion.userId).to.exist;
        expect(suggestion.userId).to.eql('userId');
    });
    it('should contain a senderId', () => {
        let suggestion = suggestionUpdate(update, userId);
        expect(suggestion.senderId).to.exist;
        expect(suggestion.senderId).to.eql('senderId');
    });
    it('should contain a senderAddress', () => {
        let suggestion = suggestionUpdate(update, userId);
        expect(suggestion.senderAddress).to.exist;
        expect(suggestion.senderAddress).to.eql('senderAddress');
    });
    it('should contain senderNames', () => {
        let suggestion = suggestionUpdate(update, userId);
        expect(suggestion.senderNames).to.exist;
        expect(suggestion.senderNames).to.eql(['senderName1', 'senderName2'])
    });
    it('should contain threadIds_internalDates', () => {
        let suggestion = suggestionUpdate(update, userId);
        expect(suggestion.threadIds_internalDates).to.exist;
        expect(suggestion.threadIds_internalDates).to.eql([
            { threadId: '123abc', internalDate: 12345 },
            { threadId: '456def', internalDate: 54321 }
        ]);
    });
    it('should contain a totalSizeEstimate', () => {
        let suggestion = suggestionUpdate(update, userId);
        expect(suggestion.totalSizeEstimate).to.exist;
        expect(suggestion.totalSizeEstimate).to.eql(12345)
    });

    describe('instance methods: ', () => {
        it('should have concatNames()', () => {
            let suggestion = suggestionUpdate(update, userId);
            expect(suggestion).to.have.property('concatNames');
        });
        it('concatNames should concat a new name', () => {
            let suggestion = suggestionUpdate(update, userId);
            expect(suggestion.senderNames).to.eql(['senderName1', 'senderName2']);
            suggestion.concatNames('newName');
            expect(suggestion.senderNames).to.eql(['senderName1', 'senderName2', 'newName']);
        });


        it('should have addToTotalSizeEstimate()', () => {
            let suggestion = suggestionUpdate(update, userId);
            expect(suggestion).to.have.property('addToTotalSizeEstimate')
            expect(suggestion).to.respondTo('addToTotalSizeEstimate');
        });
        it('addToTotalSizeEstimate should add to totalSizeEstimate', () => {
            let suggestion = suggestionUpdate(update, userId);
            suggestion.addToTotalSizeEstimate(1234);
            expect(suggestion.totalSizeEstimate).to.eql(13579);
        });
        it('should have mergeSuggestionUpdate()', () => {
            let suggestion = suggestionUpdate(update, userId);
            expect(suggestion).to.respondTo('mergeSuggestionUpdate')
            expect(suggestion).to.have.property('mergeSuggestionUpdate');
        });
        it('should merge another SuggestionUpdate', () => {
            let suggestion1 = suggestionUpdate(update, userId);
            let suggestion2 = suggestionUpdate(update2, userId2);
            suggestion1.mergeSuggestionUpdate(suggestion2);
            expect(suggestion1.userId).to.eql('userId');
            expect(suggestion1.senderId).to.eql('senderId');
            expect(suggestion1.senderNames.length).to.eql(3);
            expect(suggestion1.threadIds_internalDates.length).to.eql(4);
        });
    })
})