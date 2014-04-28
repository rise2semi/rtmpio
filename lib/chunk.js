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
    this.messageHeader = {};
    this.extendedTimestamp = null;

    this.controlMessage = false;

    this.chunkData = null;

    this.basicHeaderReceived = false;
    this.messageHeaderReceived = false;
    this.extendedTimestampReceived = false;
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
                this.basicHeaderReceived = true;
                this.controlMessage = true;
                break;
            }
        default: {
                this.basicHeaderReceived = true;
            }
    }

    return this.basicHeaderReceived;
};

function readUInt24BE( buffer, offset ) {
    return ( buffer.readUInt8( offset ) << 16 ) +
           ( buffer.readUInt8( offset + 1 ) << 8 ) +
           buffer.readUInt8( offset + 2 );
}

/**
 * Length of timestamp field in the chunk message header. (bytes)
 */
Chunk.prototype.timestampSize = 3;

/**
 * Length of timestamp delta field in the chunk message header. (bytes)
 */
Chunk.prototype.timestampDeltaSize = 3;

/**
 * If the timestamp delta is greater than or equal to 0xFFFFFF, this indicating the presence of the extended timestamp
 * field.
 */
Chunk.prototype.isExtendedTimestamp = 0xFFFFFF;

/**
 * Length of extended timestamp field in the chunk header. (bytes)
 */
Chunk.prototype.extendedTimestampSize = 4;

/**
 * Length of message length field in the chunk message header. (bytes)
 */
Chunk.prototype.messageLengthSize = 3;

/**
 * Length of message type id field in the chunk message header. (bytes)
 */
Chunk.prototype.messageTypeSize = 1;

/**
 * Length of message stream id field in the chunk message header. (bytes)
 */
Chunk.prototype.messageStreamSize = 4;

/**
 *
 */
Chunk.prototype.parseMessageHeader = function( buffer ) {
    var offset = 0;

    switch ( this.chunkType ) {
        case 0: {
                // Timestamp delta
                this.messageHeader.timestampDelta = 0;

                // Timestamp
                this.messageHeader.timestamp = readUInt24BE( buffer, offset );
                offset += this.timestampSize;

                // Message length
                this.messageHeader.messageLength = readUInt24BE( buffer, offset );
                offset += this.messageLengthSize;

                // Message type
                this.messageHeader.messageType = buffer.readUInt8( offset );
                offset += this.messageTypeSize;

                // Stream type
                // Message stream ID is stored in little-endian format.
                this.messageHeader.messageStream = this.buffer.readUInt32LE( offset );
                offset += this.messageStreamSize;

                break;
            }
        case 1: {
                // Timestamp delta
                this.messageHeader.timestampDelta = readUInt24BE( buffer, offset );
                offset += this.timestampDeltaSize;

                // Timestamp
                this.messageHeader.timestamp += this.messageHeader.timestampDelta;

                // Message length
                this.messageHeader.messageLength = readUInt24BE( buffer, offset );
                offset += this.messageLengthSize;

                // Message type
                this.messageHeader.messageType = buffer.readUInt8( offset );
                offset += this.messageTypeSize;

                break;
            }
        case 2: {
                // Timestamp delta
                this.messageHeader.timestampDelta = readUInt24BE( buffer, offset );
                offset += this.timestampDeltaSize;

                // Timestamp
                this.messageHeader.timestamp += this.messageHeader.timestampDelta;

                break;
            }
    }

    if ( this.messageHeader.timestamp && this.messageHeader.timestamp !== this.isExtendedTimestamp ) {
        this.extendedTimestampSize = 4;
    } else {
        this.extendedTimestampReceived = true;
    }

    this.messageHeaderReceived = true;

    return this.messageHeaderReceived;
};

/**
 *
 */
Chunk.prototype.parseExtendedTimestamp = function( buffer ) {
    this.extendedTimestamp = buffer.readUInt32BE( 0 );
    this.extendedTimestampReceived = true;

    return this.extendedTimestampReceived;
};
