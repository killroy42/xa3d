(function() {
'use strict';


function NetSocket(socket, instanceManager) {
	this.socket = socket;
	// Augment socket
	if(socket.on === undefined) {
		socket.on = socket.addEventListener;
	}
	this.instanceManager = instanceManager;
	this.attachSocketEventHandlers();
}
NetSocket.prototype = Object.create(null);
NetSocket.prototype.constructor = NetSocket;
NetSocket.SOCKET_EVENTS = [
	'connect',
	'connect_error',
	'connect_timeout',
	'reconnect',
	'reconnect_attempt',
	'reconnecting',
	'reconnect_error',
	'reconnect_failed',
	'disconnect',
	'error',
];
NetSocket.prototype.attachSocketEventHandlers = function() {
	console.info('NetSocket.attachSocketEventHandlers();');
	var self = this;
	var socket = this.socket;
	var im = this.instanceManager;
	NetSocket.SOCKET_EVENTS.forEach(function(event) {
		socket.on(event, console.info.bind(console, '[NET] '+event));
	});
	function onInstanceevent(data) {
		//console.info('[NetSocket] client<-server (instanceevent)', JSON.stringify(data));
		var instance = im.get(data.id);
		if(instance === undefined) {
			//console.log('  Client:', socket.id);
			//console.log('  data:', JSON.stringify(data));
			//console.log('  instances:', Object.keys(im.instances));
			var err = new Error('Instance not found: '+data.id);
			console.warn(err.message);
			return;
		}
		if(typeof instance.onEvent === 'function') instance.onEvent(data.event);
		instance.trigger('event', data.event);
	}
	socket.on('instanceevent', onInstanceevent);
};
NetSocket.prototype.send = function(data) {
	this.socket.send(data);
};


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = NetSocket;
}

})();