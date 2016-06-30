(function() {
'use strict';

var EventDispatcher = require('./EventDispatcher');
var Network = require('./Network');
var NetworkClient = require('./NetworkClient');
var BlueprintManager = require('./BlueprintManager');
var LocalConnection = require('./LocalConnection');


function NetworkServer() {
	EventDispatcher.apply(this);
	this.connectionServer = undefined;
	this.clients = [];
	this.blueprints = new BlueprintManager();
}
NetworkServer.handleConnectionDisconnected = function(reason) {
	this.client.server.handleClientDisconnect(this.client, reason);
};
NetworkServer.prototype = Object.create(null);
NetworkServer.prototype.constructor = NetworkServer;
NetworkServer.prototype.connect = function(connectionServer, onClientconnected) {
	//console.info('NetworkServer.connect(connectionServer);');
	this.connectionServer = connectionServer;
	connectionServer.on('connection', this.bindHandler(this.handleClientConnect));
	if(typeof onClientconnected === 'function') {
		this.on('clientconnected', onClientconnected);
	}
	return this;
};
NetworkServer.prototype.handleClientConnect = function(connection) {
	//console.info('NetworkServer.handleClientConnect(connection);');
	var self = this;
	var client = new NetworkClient({blueprints: this.blueprints});
	client.server = this;
	client.id = Network.generateId();
	this.clients.push(client);
	client.connect(connection);
	//if(connection.socket.readyState === 1) connection.dispatchEvent('connected');
	if(connection.isConnected) connection.dispatchEvent('connected');
	this.dispatchEvent('clientconnected', client);
	connection.once('disconnected', NetworkServer.handleConnectionDisconnected);
	return client;
};
NetworkServer.prototype.handleClientDisconnect = function(client, reason) {
	//console.info('NetworkServer.handleClientDisconnect(client, "%s");', reason);
	var idx = this.clients.indexOf(client);
	this.clients.splice(idx, 1);
};
NetworkServer.prototype.createLocalClient = function() {
	return this.handleClientConnect(new LocalConnection().attach());
};
NetworkServer.prototype.getPeers = function(client) {
	return this.clients.filter(function(peer) { return peer !== client; });
};
NetworkServer.prototype.findNetId = function(id) {
	var clients = this.clients;
	for(var i = 0, l = clients.length; i < l; i++) {
		var netIds = clients[i].netIds;
		if(netIds[id] !== undefined) return netIds[id];
	}
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = NetworkServer;
}

})();