(function() {
'use strict';

var InstanceManager = require('./InstanceManager');
var ServerSocket = require('./ServerSocket');
var ClientSocket = require('./ClientSocket');

var DEFAULT_PORT = 8080;

function bind(obj, method) {
	return function() {
		method.apply(obj, arguments);
	};
}

function XenoNetwork() {
	this.instanceManager = new InstanceManager();
	this.socket = undefined;
	this.clients = [];
}
XenoNetwork.prototype = Object.create(null);
XenoNetwork.prototype.constructor = XenoNetwork;
XenoNetwork.prototype.bind = function(func) {
	if(this.boundFuncs === undefined) this.boundFuncs = [];
	var boundFuncs = this.boundFuncs;
	var idx = boundFuncs.indexOf(func);
	if(idx !== -1) return boundFuncs[idx];
	var boundFunc = bind(this, func);
	boundFuncs.push(func);
	return boundFunc;
};
// Intances
	XenoNetwork.prototype.register = function(func) {

	};
// Server
	XenoNetwork.prototype.listen = function(wss) {
		console.info('XenoNetwork.listen(wss{"%s:%s"});', wss.options.host, wss.options.port);
		this.socket = wss;
		wss.on('connection', this.bind(this.onServerConnection));
		this.instanceManager.peerType = InstanceManager.PEERTYPE_SERVER;
		return this;
	};
	XenoNetwork.prototype.onServerConnection = function(socket) {
		console.info('XenoNetwork.onServerConnection(socket);');
		var client = new ServerSocket(socket, this.instanceManager);
		this.clients.push(client);
		socket.on('message', function(message, raw) {
			//console.log('SERVER.on(message, raw)', message);
			console.log('[S <- C]', message);
		});
		var msg = 'Hello Client';
		console.log('[S -> C]', msg);
		client.send(msg);
	};
// Client
	XenoNetwork.prototype.connect = function(opts) {
		console.info('XenoNetwork.connect(%s);', JSON.stringify(opts));
		var host = opts.host || document.location.host;
		var port = opts.port || DEFAULT_PORT;
		var url = 'ws://'+host+':'+port;
		var ws = new WebSocket(url);
		var client = this.socket = new ClientSocket(ws, this.instanceManager);
		ws.on('open', function(e) {
			console.log('CLIENT.on(open);');
			client.socket.on('message', function(e) {
				//console.log('CLIENT.on(e)', e);
				console.log('[C <- S]', e.data);
			});
			var msg = 'Hello Server';
			console.log('[C -> S]', msg);
			client.send(msg);
		});		
		this.instanceManager.peerType = InstanceManager.PEERTYPE_CLIENT;
		return this;
	};


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = XenoNetwork;
}

})();
