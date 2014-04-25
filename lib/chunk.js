/**
 * Module dependencies.
 */
var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Constructor that creates a chunk object.
 */
function Chunk() {
    EventEmitter.call( this );

    // sizes of chunk header parts
    this.basicHeaderSize = null;
    this.messageHeaderSize = null;
    this.extendedTimestampSize = 0;

    this.chunkType = null;
    this.chunkStreamId = null;

    this.controlMessage = false;

    this.basicHeaderReceived = false;
    this.messageHeaderReceived = false;
}

/**
 * Inherit the methods for events.
 */
util.inherits( Chunk, EventEmitter );

/**
 * Export constructor.
 */
module.exports = Chunk;

Chunk.prototype.parseBasicHeader = function( buffer ) {
    // XX010101 >>> 6 = 000000XX
    this.chunkType = buffer.readUInt8( 0 ) >>> 6;

    switch ( this.chunkType ) {
        case 0: {
            this.messageHeaderSize = 11;
            break;
        }
        case 1: {
            this.messageHeaderSize = 7;
            break;
        }
        case 2: {
            this.messageHeaderSize = 3;
            break;
        }
        case 3: {
            this.messageHeaderSize = 0;
            this.basicHeaderSize = 1;
            break;
        }
    }

    // 0x3F - 00111111
    this.chunkStreamId = buffer.readUInt8( 0 ) & 0x3F;

    switch ( this.chunkStreamId ) {
        case 0: {
            this.basicHeaderSize = 2;
            if ( buffer.length >= this.basicHeaderSize ) {
                this.chunkStreamId = buffer.readUInt8( 1 ) + 64;
                this.basicHeaderReceived = true;
            }

            break;
        }
        case 1: {
            this.basicHeaderSize = 3;
            if ( buffer.length >= this.basicHeaderSize ) {
                this.chunkStreamId = buffer.readUInt8( 2 ) * 256 + buffer.readUInt8( 1 ) + 64;
                this.basicHeaderReceived = true;
            }

            break;
        }
        case 2: {
            this.controlMessage = true;
            break;
        }
        default {
            this.basicHeaderReceived = true;
        }
    }

    return this.basicHeaderReceived;
}

Chunk.prototype.parseMessageHeader = function( buffer ) {

}
