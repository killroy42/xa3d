(function() {
const EventDispatcher = require('../xeno/EventDispatcher');
const IdGenerator = require('./IdGenerator');
const NetId = require('./NetId');
const BlueprintManager = require('./BlueprintManager');

class NetworkClient {
	constructor({blueprints} = {}) {
		EventDispatcher.apply(this);
		this.connection = undefined;
		this.netIds = {};
		this.idGenerator = new IdGenerator();
		this.id = undefined;
		this.pendingNetIdCreate = {};
		this.blueprints = blueprints || new BlueprintManager();
		Object.defineProperties(this, {
			isServer: { get: function() { return this.connection.isServer; } },
			isClient: { get: function() { return this.connection.isClient; } },
		});
		this.NetIdRequestdestroyHandler = this.NetIdRequestdestroyHandler.bind(this);
	}
	connect(connection) {
		//console.info('NetworkClient.connect(connection);');
		this.connection = connection;
		connection.client = this;
		connection.once('connected', this.bindHandler(this.handleConnected));
		return this;
	}
	sendData(data) {
		if(this.connection.isConnected !== true) {
			console.error('ERROR: NOT CONNECTED in NetworkClient.sendData()');
			return;
		}
		this.connection.send(data);
	}
	send(type, msg) {
		//console.info('NetworkClient.send(%s, %s);', type, JSON.stringify(msg));
		var data = JSON.stringify({type: type, msg: msg, meta: {msgId: NetworkClient.msgId++}});
		this.sendData(data);
	}
	sendPeers(type, msg) {
		//console.info('NetworkClient.sendPeers(%s, %s);', type, JSON.stringify(msg));
		this.assertServer();
		var peers = this.server.getPeers(this);
		var data = JSON.stringify({type: type, msg: msg});
		for(var i = 0, l = peers.length; i < l; i++) peers[i].sendData(data);
	}
	registerBlueprint(name, blueprint, context) {
		this.blueprints.register(name, blueprint, context);
	}
	instantiateBlueprint(name, state, netId) {
		// FIXIT: netId could be a promise!
		if(state instanceof NetId) {
			netId = state;
			state = {};
		}
		if(netId === undefined) netId = this.createNetId(); // optionally create new NetId
		return this.blueprints.instantiate(netId, name, state);
	}
	NetIdRequestdestroyHandler() {
		this.client.send(NetId.MSG_DESTROY, this.serialize());
	}
}
NetworkClient.NOID = 0;
NetworkClient.msgId = 0;

// NetId
	NetworkClient.prototype.createNetId = function(ref, id) {
		//console.info('NetworkClient.createNetId(ref:%s, id:%s);', ref?ref:'n/a', id?id:'n/a');
		var self = this;
		var netId;
		if(this.isClient) {
			if(ref === undefined) {
				ref = this.idGenerator.generateId();
				this.send(NetId.MSG_CREATE, {ref: ref});
				netId = new Promise(function(resolve, reject) {
					self.pendingNetIdCreate[ref] = {resolve: resolve, reject: reject};
				});
			} else {
				netId = this.addNetId(new NetId(this, id));
				var p = this.pendingNetIdCreate[ref];
				if(p !== undefined) {
					p.resolve(netId);
					delete this.pendingNetIdCreate[ref];
				}
			}
		}
		else if(this.isServer) {
			netId = this.addNetId(new NetId(this, this.idGenerator.generateId()));
			this.send(NetId.MSG_CREATE, {ref: ref, netid: netId.serialize()});
			this.sendPeers(NetId.MSG_CREATE_PEER, netId.serialize());
		}
		return netId;
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
		if(this.isClient)	netId.once('requestdestroy', this.NetIdRequestdestroyHandler);
		return netId;
	};
	NetworkClient.prototype.removeNetId = function(netId) {
		if(netId.id !== undefined) netId = netId.id;
		this.netIds[netId].off('requestdestroy', this.NetIdRequestdestroyHandler);
		delete this.netIds[netId];
		return netId;
	};
	NetworkClient.prototype.destroyNetId = function(netId) {
		console.info('NetworkClient.destroyNetId(%s);', netId.id);
		netId.state = NetId.DESTROYED;
		if(this.isServer) {
			var msg = netId.serialize();
			if(this.connection.isConnected) this.send(NetId.MSG_DESTROY, msg);
			this.sendPeers(NetId.MSG_DESTROY, msg);
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
			this.send(NetId.MSG_CLIENT_INIT, {id: this.id});
			var client = this;
			var peers = this.server.getPeers(this);
			peers.forEach(function(peer) {
				Object.keys(peer.netIds).forEach(function(id) {
					var netId = peer.netIds[id];
					client.send(NetId.MSG_CREATE_PEER, netId.serialize());
					netId.dispatchEvent('createpeer', client);
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
			case NetId.MSG_CLIENT_INIT: 
				this.assertClient();
				this.id = msg.id;
				break;
			case NetId.MSG_MSG:
				netId = this.netIds[msg.id];
				if(netId === undefined) netId = this.server.findNetId(msg.id);
				netId.dispatchEvent('msg', msg.msg);
				break;
			case NetId.MSG_MSG_PEERS:
				netId = this.netIds[msg.id];
				this.sendPeers(NetId.MSG_MSG, {id: netId.id, msg: msg.msg});
				break;
			case NetId.MSG_CREATE: this.createNetId(msg.ref, (msg.netid !== undefined)?msg.netid.id:undefined); break;
			case NetId.MSG_CREATE_PEER: this.addNetId(new NetId(this, msg.id, true)); break;
			case NetId.MSG_DESTROY: this.destroyNetId(this.getNetId(msg.id)); break;
			case NetId.MSG_BP_CREATE:
				//console.log('MSG_BP_CREATE', JSON.stringify(msg));
				this.instantiateBlueprint(msg.name, msg.state, this.getNetId(msg.netid.id));
				break;
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