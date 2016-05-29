(function() {
'use strict';

var ws = require('ws');
var WebSocketServer = ws.Server;

var ConnectionServer = require('./ConnectionServer');
var WebSocketConnection = require('./WebSocketConnection');


function WebSocketConnectionServer() {
	ConnectionServer.apply(this);
}
WebSocketConnectionServer.prototype = Object.create(ConnectionServer.prototype);
WebSocketConnectionServer.prototype.constructor = WebSocketConnectionServer;
WebSocketConnectionServer.prototype.listen = function(opts) {
	//console.info('WebSocketConnectionServer.listen(%s);', JSON.stringify(opts));
	var self = this;
	var wss = new WebSocketServer({host: opts.host, port: opts.port});
	wss.on('connection', function(socket) {
		// Add browser compatible API: removeEventListener
		if(socket.removeEventListener === undefined && typeof socket.removeListener === 'function') {
			socket.removeEventListener = socket.removeListener;
		}
		self.handleConnection(new WebSocketConnection().attach(socket));
	});
	return this;
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = WebSocketConnectionServer;
}

})();