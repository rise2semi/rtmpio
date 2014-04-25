/**
 * Module dependencies.
 */
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Chunk = require('chunk');

function MessageParser( stream ) {
    this.stream = stream;

    this.chunk = null;
    this.previousChunk = null;

    this.remainingData = null;
}

MessageParser.prototype.listenMessages = function() {
    this.stream.on( 'data', this.readStreamData.bind( this ) );
}

MessageParser.prototype.readStreamData = function( data ) {
    var dataLength = data.length;

    if ( this.remainingData ) {
        dataLength = this.remainingChunk.length + chunk.length;
        data = Buffer.concat( [ this.remainingData, data ], dataLength );
    }

    if ( !this.chunk ) {
        this.chunk = new Chunk();
    }

    if ( !this.chunk.basicHeaderReceived && dataLength >= this.chunk.basicHeaderSize ) {
        var received = chunk.parseBasicHeader( data );

        if ( !received ) {
            this.remainingData = data;
            return;
        }

        data = data.slice( this.chunk.basicHeaderSize );
        dataLength = this.chunk.length;
    }

    if ( !this.chunk.messageHeaderReceived && dataLength >= this.chunk.messageHeaderSize ) {
        var received = this.chunk.parseMessageHeader( data );

        if ( !received ) {
            this.remainingData = data;
            return;
        }

        data = data.slice( this.chunk.messageHeaderSize );
        dataLength = this.chunk.length;
    }
}
