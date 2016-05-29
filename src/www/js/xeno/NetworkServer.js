(function() {
'use strict';

var EventDispatcher = require('./EventDispatcher');
var Network = require('./Network');
var NetworkClient = require('./NetworkClient');


function NetworkServer() {
	EventDispatcher.apply(this);
	this.connection = undefined;
	this.clients = [];
}
NetworkServer.prototype = Object.create(null);
NetworkServer.prototype.constructor = NetworkServer;
NetworkServer.prototype.connect = function(connectionServer) {
	//console.info('NetworkServer.connect(connectionServer);');
	this.connectionServer = connectionServer;
	connectionServer.on('connection', this.bindHandler(this.handleClientConnect));
	return this;
};
NetworkServer.prototype.handleClientConnect = function(connection) {
	console.info('NetworkServer.handleClientConnect(connection);');
	var self = this;
	var client = new NetworkClient();
	client.server = this;
	client.id = Network.generateId();
	this.clients.push(client);
	client.connect(connection);
	if(connection.socket.readyState === 1) {
		connection.dispatchEvent('connected');
	}
	this.dispatchEvent('clientconnected', client);
	connection.on('disconnect', function(reason) {
		self.handleClientDisconnect(client, reason);
	});
	// Init proxies
		var peers = this.getPeers(client);
		peers.forEach(function(peer) {
			Object.keys(peer.netIds).forEach(function(id) {
				var netId = peer.netIds[id];
				client.send('id.peer', netId.serialize());
			});
		});
};
NetworkServer.prototype.handleClientDisconnect = function(client, reason) {
	console.info('NetworkServer.handleClientDisconnect(client, "%s");', reason);
	var idx = this.clients.indexOf(client);
	this.clients.splice(idx, 1);
};
NetworkServer.prototype.getPeers = function(client) {
	return this.clients.filter(function(peer) { return peer !== client; });
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = NetworkServer;
}

})();