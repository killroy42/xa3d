/*jslint node: true */
'use strict';

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: 7890});

//wss.on('connection', function connection(ws) {});

/*
// Client:

var TIMEOUT = 300;
var ws = new WebSocket('ws://127.0.0.1:8888/');
ws.addEventListener('open', function() {
	console.info('Socket open');
});
ws.addEventListener('close', function() {
	console.info('Socket closed');
	setTimeout(function() {
		console.info('Reloading...');
		document.location.reload(true);
	}, TIMEOUT);
});

*/