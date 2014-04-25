var rtmpParser = require('../lib/rtmpio');
var net = require('net');

var server = net.createServer();

server.on('connection', function( connection ) {
    var handshake = new rtmpParser.Handshake( connection );
    handshake.listenVersion();

    handshake.on('zero', function( version ) {
        console.log( 'Version: ' + version );

        handshake.sendVersion();
    });

    handshake.on('one', function( chunk ) {
        console.log( 'Random data: ' + chunk.randomData.toString('base64') );

        handshake.sendData();
    });

    handshake.on('two', function( chunk ) {
        console.log( 'Random response data: ' + chunk.randomData.toString('base64') );

        handshake.sendAcknowledge( chunk.randomData );
    });

    handshake.on('done', function() {
        console.log('Handshake success!');

        var msgParser = new rtmpParser.MessageParser( connection );
        msgParser.listenMessages();

        msgParser.on('message', function( message ) {
            console.log( message );
        });

        connection.resume();
    });
});

server.listen( 1935, function() {
  console.log('server listened');
});
