(function() {
'use strict';

var Connection = require('./Connection');


function WebSocketConnection() {
	Connection.apply(this);
}
WebSocketConnection.DEFAULT_PORT = 8080;
WebSocketConnection.prototype = Object.create(Connection.prototype);
WebSocketConnection.prototype.constructor = WebSocketConnection;
WebSocketConnection.prototype.connect = function(opts) {
	//console.info('WebSocketConnection.connect(%s);', JSON.stringify(opts));
	Connection.prototype.connect.call(this);
	var self = this;
	var host = opts.host || document.location.host;
	var port = opts.port || WebSocketConnection.DEFAULT_PORT;
	var url = 'ws://'+host+':'+port;
	if(this.socket !== undefined) throw new Error('Socket already connected');
	var ws = new WebSocket(url);
	//ws.addEventListener('open', function(e) { console.log(' >> ws.open'); });
	//ws.addEventListener('close', function(e) { console.log(' >> ws.close'); });
	//if(ws.on) ws.on('open', function(e) { console.log(' >> ws.on open'); });
	//if(ws.on) ws.on('close', function(e) { console.log(' >> ws.on close'); });
	this.attach(ws);
	return this;
};
WebSocketConnection.prototype.disconnect = function(reason) {
	//console.info('WebSocketConnection.disconnect();');
	Connection.prototype.disconnect.call(this);
	if(this.socket === undefined) throw new Error('Socket not connected');
	this.socket.close();
	return this;
};
WebSocketConnection.prototype.attach = function(ws) {
	//console.info('WebSocketConnection.attach(ws);');
	Connection.prototype.attach.call(this);
	var self = this;
	this.socket = ws;
	var handleOpen = this.delegate('connected');
	var handleMessage = this.delegate('message', function(e) { return e.data; });
	var handleError = this.delegate('error');
	var handleClose = function(e) {
		if(typeof ws.removeAllListeners === 'function') {
			ws.removeAllListeners();
		} else {
			ws.removeEventListener('open', handleOpen);
			ws.removeEventListener('message', handleMessage);
			ws.removeEventListener('error', handleError);
			ws.removeEventListener('close', handleClose);
		}
		self.socket = undefined;
		self.isClient = false;
		self.isServer = false;
		self.isConnected = false;
		self.dispatchEvent('disconnected', e.reason);
	};
	ws.addEventListener('open', handleOpen);
	ws.addEventListener('message', handleMessage);
	ws.addEventListener('error', handleError);
	ws.addEventListener('close', handleClose);
	return this;
};
WebSocketConnection.prototype.send = function(data) {
	//console.info('WebSocketConnection.send(%s);', JSON.stringify(data));
	if(this.socket === undefined || this.socket.readyState !== 1) {
		console.error('E(Socket not open) @ WebSocketConnection.send("%s")', data);
		if(this.socket) console.log('  readyState:', this.socket.readyState);
		return;
	}
	this.socket.send(data);
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = WebSocketConnection;
}

})();