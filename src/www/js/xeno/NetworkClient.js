(function() {
'use strict';

var EventDispatcher = require('./EventDispatcher');
var Network = require('./Network');
var NetId = require('./NetId');


function NetworkClient() {
	EventDispatcher.apply(this);
	this.connection = undefined;
	this.netIds = {};
	this.id = NetworkClient.NOID;
	Object.defineProperties(this, {
		isServer: { get: function() { return this.connection.isServer; } },
		isClient: { get: function() { return this.connection.isClient; } },
	});
}
NetworkClient.NOID = 0;
NetworkClient.msgId = 0;
NetworkClient.MSG_CLIENT_INIT = 'client.init';
NetworkClient.MSG_NETID_MSG = 'netid.msg';
NetworkClient.MSG_NETID_CREATE = 'netid.create';
NetworkClient.MSG_NETID_CREATE_PEER = 'netid.create.peer';
NetworkClient.MSG_NETID_DESTROY = 'netid.destroy';
NetworkClient.NetIdRequestdestroyHandler = function() {
	this.client.send(NetworkClient.MSG_NETID_DESTROY, this.serialize());
};
NetworkClient.prototype = Object.create(null);
NetworkClient.prototype.constructor = NetworkClient;
// Actions
	NetworkClient.prototype.connect = function(connection) {
		//console.info('NetworkClient.connect(connection);');
		this.connection = connection;
		connection.client = this;
		connection.once('connected', this.bindHandler(this.handleConnected));
		return this;
	};
	NetworkClient.prototype.sendData = function(data) {
		if(this.connection.isConnected !== true) {
			console.error('ERROR: NOT CONNECTED');
			return;
		}
		this.connection.send(data);
	};
	NetworkClient.prototype.send = function(type, msg) {
		//console.info('NetworkClient.send(%s, %s);', type, JSON.stringify(msg));
		this.sendData(JSON.stringify({type: type, msg: msg, meta: {msgId: NetworkClient.msgId++}}));
	};
	NetworkClient.prototype.sendPeers = function(type, msg) {
		//console.info('NetworkClient.sendPeers(%s, %s);', type, JSON.stringify(msg));
		this.assertServer();
		var peers = this.server.getPeers(this);
		var data = JSON.stringify({type: type, msg: msg});
		for(var i = 0, l = peers.length; i < l; i++) peers[i].sendData(data);
	};
// NetId
	NetworkClient.prototype.createNetId = function() {
		//console.info('NetworkClient.createNetId();');
		this.send(NetworkClient.MSG_NETID_CREATE);
	};
	NetworkClient.prototype.hasNetId = function(id) {
		//console.info('NetworkClient.hasNetId("%s");', id);
		if(id instanceof NetId) id = id.id;
		var netId = this.netIds[id];
		if(netId === undefined) return false;
		return true;
	};
	NetworkClient.prototype.getNetId = function(id) {
		//console.info('NetworkClient.getNetId("%s");', id);
		if(id instanceof NetId) id = id.id;
		var netId = this.netIds[id];
		if(netId === undefined) throw new Error('Cannot find netId: '+id);
		return netId;
	};
	NetworkClient.prototype.addNetId = function(netId) {
		//console.info('NetworkClient.addNetId(%s);', netId.id);
		this.netIds[netId.id] = netId;
		if(this.isClient)	netId.once('requestdestroy', NetworkClient.NetIdRequestdestroyHandler);
		return netId;
	};
	NetworkClient.prototype.removeNetId = function(netId) {
		if(netId.id !== undefined) netId = netId.id;
		this.netIds[netId].off('requestdestroy', NetworkClient.NetIdRequestdestroyHandler);
		delete this.netIds[netId];
		return netId;
	};
	NetworkClient.prototype.destroyNetId = function(netId) {
		//console.info('NetworkClient.destroyNetId(%s);', netId.id);
		netId.state = NetId.DESTROYED;
		if(this.isServer) {
			var msg = netId.serialize();
			if(this.connection.isConnected) this.send(NetworkClient.MSG_NETID_DESTROY, msg);
			this.sendPeers(NetworkClient.MSG_NETID_DESTROY, msg);
		}
		this.removeNetId(netId);
		return netId;
	};
// Handlers
	NetworkClient.prototype.handleConnected = function() {
		//console.info('NetworkClient.handleConnected();');
		var connection = this.connection;
		connection.on('message', this.bindHandler(this.handleMessage));
		if(this.isServer) {
			this.send(NetworkClient.MSG_CLIENT_INIT, {id: this.id});
			// Create peer NetIDs
			var client = this;
			var peers = this.server.getPeers(this);
			peers.forEach(function(peer) {
				Object.keys(peer.netIds).forEach(function(id) {
					var netId = peer.netIds[id];
					client.send(NetworkClient.MSG_NETID_CREATE_PEER, netId.serialize());
				});
			});
		}
		connection.once('disconnected', this.bindHandler(this.handleDisconnect));
	};
	NetworkClient.prototype.handleDisconnect = function() {
		//console.info('NetworkClient.handleDisconnect();');
		var connection = this.connection;
		connection.off('message', this.bindHandler(this.handleMessage));
		var netIds = this.netIds;
		var ids = Object.keys(netIds);
		for(var i = 0, l = ids.length; i < l; i++) {
			var netId = netIds[ids[i]];
			this.destroyNetId(netIds[ids[i]]);
		}
	};
	NetworkClient.prototype.handleMessage = function(rawData) {
		//console.info('NetworkClient.handleMessage(%s);', JSON.stringify(rawData));
		var data = JSON.parse(rawData);
		var msg = data.msg;
		var netId;
		switch(data.type) {
			case 'ping': this.sendData('pong'); break;
			case NetworkClient.MSG_CLIENT_INIT: 
				this.assertClient();
				this.id = msg.id;
				break;
			case NetworkClient.MSG_NETID_MSG: this.netIds[msg.id].dispatchEvent('msg', msg.msg); break;
			case NetworkClient.MSG_NETID_CREATE:
				var newId = this.isServer?Network.generateId():msg.id;
				netId = this.addNetId(new NetId(this, newId));
				if(this.isServer) {
					msg = netId.serialize();
					this.send(NetworkClient.MSG_NETID_CREATE, msg);
					this.sendPeers(NetworkClient.MSG_NETID_CREATE_PEER, msg);
				}
				break;
			case NetworkClient.MSG_NETID_CREATE_PEER: this.addNetId(new NetId(this, msg.id, true)); break;
			case NetworkClient.MSG_NETID_DESTROY: this.destroyNetId(this.getNetId(msg.id)); break;
			default: console.error('Invalid message:', rawData);
		}
	};
// Checks
	NetworkClient.prototype.assertClient = function() {
		if(this.isClient !== true) throw new Error('Action not available on server');
	};
	NetworkClient.prototype.assertServer = function() {
		if(this.isServer!== true) throw new Error('Action not available on clients');
	};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = NetworkClient;
}

})();