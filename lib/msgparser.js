/**
 * Module dependencies.
 */
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Chunk = require('./chunk');

function MessageParser( stream ) {
    EventEmitter.call( this );

    this.stream = stream;

    this.chunk = null;
    this.previousChunk = null;

    this.remainingData = null;
}

/**
 * Inherit the methods for events.
 */
util.inherits( MessageParser, EventEmitter );

MessageParser.prototype.listenMessages = function() {
    this.stream.on( 'data', this.readStreamData.bind( this ) );
};

MessageParser.prototype.readStreamData = function( data ) {
    var dataLength = data.length;
    var receivedHeadPart;

    if ( this.remainingData ) {
        dataLength = this.remainingChunk.length + data.length;
        data = Buffer.concat( [ this.remainingData, data ], dataLength );
    }

    if ( !this.chunk ) {
        this.chunk = new Chunk();
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
};
