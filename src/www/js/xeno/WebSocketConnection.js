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
	var ws = new WebSocket(url);
	//ws.addEventListener('open', this.bindHandler(this.HandleConnected));
	this.attach(ws);
	return this;
};
WebSocketConnection.prototype.disconnect = function() {
	//console.info('WebSocketConnection.disconnect();');
	Connection.prototype.disconnect.call(this);
	this.socket.close();
	//this.socket = undefined;
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
	//var handleClose = this.delegate('disconnect', function(e) { return e.reason; });
	var handleClose = function(e) {
		if(typeof ws.removeAllListeners === 'function') {
			ws.removeAllListeners();
		} else {
			ws.removeEventListener('open', handleOpen);
			ws.removeEventListener('message', handleMessage);
			ws.removeEventListener('error', handleError);
			ws.removeEventListener('close', handleClose);
		}
		self.dispatchEvent('disconnect', e.reason);
	};
	ws.addEventListener('open', handleOpen);
	ws.addEventListener('message', handleMessage);
	ws.addEventListener('error', handleError);
	ws.addEventListener('close', handleClose);
	/*
	ws.addEventListener('error', function(e) {
		console.error('WebSocketConnection.on(error):', e.type);
		console.log(e);
	});
	ws.addEventListener('close', function(e) {
		console.warn('WebSocketConnection.on(close):', e.type);
		console.log('e.code:', e.code);
		console.log('e.reason:', e.reason);
	});
	*/
	return this;
};
WebSocketConnection.prototype.send = function(data) {
	//console.info('WebSocketConnection.send(%s);', JSON.stringify(data));
	//console.log(Object.keys(this.socket));
	//console.log('readyState:', this.socket.readyState);
	//console.log('_closeCode:', this.socket._closeCode);
	if(this.socket.readyState !== 1) {
		console.warn('E(Socket not open) @ WebSocketConnection.send("%s")', data);
		return;
	}
	this.socket.send(data);
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = WebSocketConnection;
}

})();