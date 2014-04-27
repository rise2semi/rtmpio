/**
 * Module dependencies.
 */
var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Constructor that creates an object for a handshake.
 */
function Handshake( stream ) {
    EventEmitter.call( this );

    this.stream = stream;
    this.state = Handshake.STATE_UNINITIALIZED;
    this.remainingChunk = null;

    this.firstChunkData = null;
    this.secondChunkData = null;

    this.zeroChunkReceived = false;
    this.firstChunkReceived = false;
    this.secondChunkReceived = false;
}

/**
 * Inherit the methods for events.
 */
util.inherits( Handshake, EventEmitter );

/**
 * Export constructor.
 */
module.exports = Handshake;

/**
 * Length of fragment C0, S0. (bytes)
 */
Handshake.prototype.zeroChunkSize = 1;

/**
 * RTMP protocol version.
 */
Handshake.prototype.version = 0x3;

/**
 * Create a package with a version of the RTMP protocol for C0 or S0.
 */
Handshake.prototype.createZeroChunk = function( buffer ) {
    buffer.writeUInt8( this.version, 0 );
};

/**
 * Retrieve the version of the RTMP protocol wrom the data chunk.
 */
Handshake.prototype.parseZeroChunk = function( buffer ) {
    return buffer.readUInt8( 0 );
};

/**
 * Verifies the correct value of protocol version.
 */
Handshake.prototype.isValidZeroChunk = function( value ) {
    return ( value === this.version );
};

/**
 * Fragment length for C1 and S1. (bytes)
 */
Handshake.prototype.firstChunkSize = 1536;

/**
 * Length of random data for C1, S1, C2, S2. (bytes)
 */
Handshake.prototype.randomDataSize = 1528;

/**
 * Time, as a starting point for calculating a sequence fragments are received.
 * TODO: the ability to specify a specific value for the synchronization multiple threads.
 */
Handshake.prototype.time = 0x0;

/**
 * Length of field with time for C1, S1, C2, S2. (bytes)
 */
Handshake.prototype.timeSize = 4;

/**
 * Zero value.
 */
Handshake.prototype.zero = 0x0;

/**
 * Length of field with zero value.
 */
Handshake.prototype.zeroSize = 4;

/**
 * Value which is filled fragment of random data.
 * TODO: make possible to specify the data that will be used to fill the field with random data (limit 1528 bytes).
 */
Handshake.prototype.randomData = 0x1;

/**
 * Create a data packet for C1 or S1.
 * Contains:
 *  - (4 bytes) time relative to which, later will be sent fragments
 *  - (4 bytes) field with zeros (according to specification)
 *  - generated random data
 */
Handshake.prototype.createFirstChunk = function( buffer ) {
    buffer.writeUInt32BE( this.time, 0 );
    buffer.writeUInt32BE( this.zero, this.timeSize );
    buffer.fill( this.randomData, this.timeSize + this.zeroSize, this.randomDataSize );
};

function parseFollowingChunks( buffer ) {
    var chunkData = {};

    chunkData.time = buffer.readUInt32BE( 0 );
    chunkData.zero = buffer.readUInt32BE( this.timeSize );
    chunkData.randomData = buffer.slice( this.timeSize + this.zeroSize );

    return chunkData;
}

/**
 * Get data according to C1 or S1 fragment.
 */
Handshake.prototype.parseFirstChunk = parseFollowingChunks;

/**
 * Validates values ​​according to C1 or S1.
 */
Handshake.prototype.isValidFirstChunk = function( value ) {
    return ( value.time && value.zero && value.randomData );
};

/**
 * Fragment length for C2 and S2. (bytes)
 */
Handshake.prototype.chunkSecondSize = 1536;

/**
 * Generate packet with data for the C2 or S2.
 */
Handshake.prototype.createSecondChunk = function( buffer, data ) {
    buffer.writeUInt32BE( this.firstChunkData.time, 0 );
    buffer.writeUInt32BE( this.time, this.timeSize );
    buffer.copy( data, 0, this.timeSize + this.zeroSize, this.randomDataSize );
};

/**
 * Get data according to C2 or S2 fragment.
 */
Handshake.prototype.parseSecondChunk = parseFollowingChunks;

/**
 * TODO: validate the C2 and S2 chunks.
 */
Handshake.prototype.isValidSecondChunk = function() {
    return true;
};

/**
 * Handshake state.
 */
Handshake.prototype.STATE_UNINITIALIZED = 0;
Handshake.prototype.STATE_VERSION_SENT = 1;
Handshake.prototype.STATE_ACK_SENT = 2;
Handshake.prototype.STATE_HANDSHAKE_DONE = 3;

/**
 * Wait the client connection.
 * When receives C0 and C1 fragments, need to send to client S0 and S1 fragments.
 */
Handshake.prototype.listenVersion = function() {
    this.stream.on('data', this.readStreamData.bind( this ) );
};

/**
 * Start handshake with server.
 * Send C0 and C1 fragments and change handshake state.
 */
Handshake.prototype.sendVersion = function() {
    var buffer = new Buffer( this.zeroChunkSize );

    this.createZeroChunk( buffer );

    this.stream.write( buffer );
};

Handshake.prototype.sendData = function() {
    var buffer = new Buffer( this.firstChunkSize );

    this.createFirstChunk( buffer );
    this.stream.write( buffer );

    this.state = Handshake.STATE_VERSION_SENT;
};

Handshake.prototype.sendAcknowledge = function( data ) {
    var buffer = new Buffer( this.chunkSecondSize );

    this.createSecondChunk( buffer, data );
    this.stream.write( buffer );

    this.state = Handshake.STATE_ACK_SENT;
};

Handshake.prototype.readStreamData = function( chunk ) {
    var chunkLength = chunk.length;

    if ( this.remainingChunk ) {
        chunkLength = this.remainingChunk.length + chunk.length;
        chunk = Buffer.concat( [ this.remainingChunk, chunk ], chunkLength );
    }

    if ( !this.zeroChunkReceived && chunkLength >= this.zeroChunkSize ) {
        var zeroChunk = this.parseZeroChunk.call( this, chunk );

        if ( !this.isValidZeroChunk( zeroChunk ) ) {
            this.emit('error', 'Zero chunk invalid');
            return;
        }

        this.emit('zero', zeroChunk );
        this.zeroChunkReceived = true;

        chunk = chunk.slice( this.zeroChunkSize );
        chunkLength = chunk.length;
    }

    if ( !this.firstChunkReceived && chunkLength >= this.firstChunkSize ) {
        var firstChunk = this.parseFirstChunk.call( this, chunk );

        if ( !this.isValidFirstChunk( firstChunk ) ) {
            this.emit('error', 'First chunk invalid');
            return;
        }

        this.emit('first', firstChunk );
        this.firstChunkReceived = true;
        this.firstChunkData = firstChunk;

        chunk = chunk.slice( this.firstChunkSize );
        chunkLength = chunk.length;
    }

    if ( !this.secondChunkReceived && chunkLength >= this.chunkSecondSize ) {
        var secondChunk = this.parseSecondChunk.call( this, chunk );

        if ( !this.isValidSecondChunk( secondChunk ) ) {
            this.emit('error', 'Second chunk invalid');
            return;
        }

        this.emit('second', secondChunk );
        this.secondChunkReceived = true;
        this.secondChunkData = secondChunk;
        this.state = Handshake.STATE_HANDSHAKE_DONE;

        chunk = chunk.slice( this.chunkSecondSize );

        this.remainingChunk = null;
        this.stream.removeAllListeners('data');

        this.emit('done', this.stream );

        this.stream.pause();
        this.stream.emit('data', chunk );
    }

    this.remainingChunk = chunk;
};
