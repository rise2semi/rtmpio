/**
 * Module dependencies.
 */
var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Constructor that creates a chunk object.
 */
function Message() {
    EventEmitter.call( this );

    this.chunks = [];
    this.data = null;
    this.totalLength = null;
}

/**
 * Inherit the methods for events.
 */
util.inherits( Message, EventEmitter );

/**
 * Export constructor.
 */
module.exports = Message;

/**
 * Add a chunk to the list that generate a message. 
 */
Message.prototype.addChunk = function( chunk ) {
    this.chunks.push( chunk );

    // Append data
    this.data = ( this.data ) ? Buffer.concat([ this.data, chunk.data ]) : chunk.data;
};
