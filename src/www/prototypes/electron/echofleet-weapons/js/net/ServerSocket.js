(function() {
'use strict';

var NetSocket = require('./NetSocket');


function ServerSocket() {
	NetSocket.apply(this, arguments);
	this.peerType = 'serverClient';
	this.attachServerEventHandlers();
	this.initProxies();
}
ServerSocket.prototype = Object.create(NetSocket.prototype);
ServerSocket.prototype.constructor = ServerSocket;
ServerSocket.prototype.attachServerEventHandlers = function() {
	var self = this;
	var socket = this.socket;
	var im = this.instanceManager;
	function onCreateinstance(data) {
		//console.info('[ServerSocket] server<-client [createinstance]', JSON.stringify(data));
		var instance = im.instantiateNetObject(null, 'server', data.instance.type, self);
		self.sendToClient('createclient', {instance: {id: instance.id, clientId: data.instance.id}});
		self.sendToPeers('createproxy', {instance: instance});
	}
	function onDisconnect(reason) {
		console.log('Client disconnected because: "%s"', reason);
		var ownedInstances = im.find('owner', self);
		console.log('  Destroying %s instances', ownedInstances.length);
		ownedInstances.forEach(function(instance) {
			self.sendToPeers('destroyinstance', {instance: instance});
			im.destroyInstance(instance);
		});
	}

	socket.on('createinstance', onCreateinstance);
	socket.on('disconnect', onDisconnect);
};
ServerSocket.prototype.initProxies = function() {
	var socket = this.socket;
	var instances = this.instanceManager.instances;
	//console.log('  Instances:', Object.keys(instances));
	Object.keys(instances)
		.map(function(id) { return instances[id]; })
		.forEach(function(instance) {
			//console.log('  Existing instance: %s[%s]', instance.typeName, instance.id);
			//console.info('  server->proxy [createproxy]', JSON.stringify(instance));
			socket.emit('createproxy', {instance: instance});
		});
};
ServerSocket.prototype.sendToClient = function(event, data) {
	this.socket.emit(event, data);
};
ServerSocket.prototype.sendToPeers = function(event, data) {
	this.socket.broadcast.emit(event, data);
};
ServerSocket.prototype.sendToAllClients = function(event, data) {
	this.socket.server.emit(event, data);
};


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = ServerSocket;
}

})();