/**
 * Module dependencies.
 */
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Chunk = require('./chunk');
var Message = require('./message');

function MessageParser( stream ) {
    EventEmitter.call( this );

    this.stream = stream;

    // Incomming message
    this.message = null;

    this.chunk = null;
    this.previousChunk = null;

    this.remainingData = null;

    this.chunkSize = 128;
}

/**
 * Inherit the methods for events.
 */
util.inherits( MessageParser, EventEmitter );

/**
 * Export constructor.
 */
module.exports = MessageParser;

MessageParser.prototype.listenMessages = function() {
    this.stream.on( 'data', this.readStreamData.bind( this ) );
};

MessageParser.prototype.readStreamData = function( data ) {
    var dataLength = data.length;
    var receivedHeadPart;

    if ( this.remainingData ) {
        dataLength = this.remainingData.length + data.length;
        data = Buffer.concat( [ this.remainingData, data ], dataLength );
    }

    if ( !this.chunk ) {
        this.chunk = new Chunk();
    }

    // Create new incoming message
    if ( !this.message ) {
        this.message = new Message();
    }

    if ( !this.chunk.basicHeaderReceived && dataLength >= this.chunk.basicHeaderSize ) {
        receivedHeadPart = this.chunk.parseBasicHeader( data );

        if ( !receivedHeadPart ) {
            this.remainingData = data;
            return;
        }

        data = data.slice( this.chunk.basicHeaderSize );
        dataLength = this.chunk.length;
    }

    if ( !this.chunk.messageHeaderReceived && dataLength >= this.chunk.messageHeaderSize ) {
        receivedHeadPart = this.chunk.parseMessageHeader( data );

        if ( !receivedHeadPart ) {
            this.remainingData = data;
            return;
        }

        data = data.slice( this.chunk.messageHeaderSize );
        dataLength = this.chunk.length;
    }

    if ( !this.chunk.extendedTimestampReceived && dataLength >= this.chunk.extendedTimestampSize ) {
        receivedHeadPart = this.chunk.parseExtendedTimestamp( data );

        if ( !receivedHeadPart ) {
            this.remainingData = data;
            return;
        }

        data = data.slice( this.chunk.extendedTimestampSize );
        dataLength = this.chunk.length;
    }

    if ( dataLength >= this.chunkSize ) {
        this.chunk.chunkData = data.slice( 0, this.chunkSize );

        // TODO

    }

    this.remainingData = data;
};
