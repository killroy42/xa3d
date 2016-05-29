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
}
NetworkClient.NOID = 0;
NetworkClient.msgId = 0;
NetworkClient.prototype = Object.create(null);
NetworkClient.prototype.constructor = NetworkClient;
// Actions
	NetworkClient.prototype.connect = function(connection) {
		//console.info('NetworkClient.connect(connection);');
		this.connection = connection;
		connection.client = this;
		connection.on('connected', this.bindHandler(this.handleConnected));
		connection.on('disconnect', this.bindHandler(this.handleDisconnect));
		return this;
	};
	NetworkClient.prototype.sendData = function(data) {
		this.connection.send(data);
	};
	NetworkClient.prototype.send = function(type, msg) {
		//console.info('NetworkClient.send(%s, %s);', type, JSON.stringify(msg));
		this.connection.send(JSON.stringify({type: type, msg: msg, meta: {msgId: NetworkClient.msgId++}}));
	};
	NetworkClient.prototype.sendPeers = function(type, msg) {
		//console.info('NetworkClient.sendPeers(%s, %s);', type, JSON.stringify(msg));
		this.assertServer();
		var peers = this.server.getPeers(this);
		var data = JSON.stringify({type: type, msg: msg});
		for(var i = 0, l = peers.length; i < l; i++) peers[i].sendData(data);
	};
// NetId
	NetworkClient.prototype.getNetId = function(id) {
		//console.info('NetworkClient.getNetId("%s");', id);
		var netId = this.netIds[id];
		if(netId === undefined) throw new Error('Cannot find netId: '+id);
		return netId;
	};
	NetworkClient.prototype.addNetId = function(netId) {
		//console.info('NetworkClient.addNetId(%s);', netId.id);
		this.netIds[netId.id] = netId;
		return this;
	};
	NetworkClient.prototype.removeNetId = function(netId) {
		//console.info('NetworkClient.removeNetId(%s);', netId.id);
		delete this.netIds[netId.id];
		return this;
	};
	NetworkClient.prototype.createNetId = function() {
		//console.info('NetworkClient.createNetId();');
		var netId = new NetId({owner: this}).create(Network.generateId());
		this.addNetId(netId);
		return netId;
	};
// Handlers
	NetworkClient.prototype.handleConnected = function() {
		//console.info('NetworkClient.handleConnected();');
		var connection = this.connection;
		connection.on('message', this.bindHandler(this.handleMessage));
		console.log('isServer:', this.isServer());
		if(this.isServer()) {
			console.log('id:', this.id);
			this.send('client.init', {id: this.id});
		}
	};
	NetworkClient.prototype.handleDisconnect = function() {
		//console.info('NetworkClient.handleDisconnect();');
		var connection = this.connection;
		connection.off('message', this.bindHandler(this.handleMessage));
		var netIds = this.netIds;
		var ids = Object.keys(netIds);
		for(var i = 0, l = ids.length; i < l; i++) {
			var netId = netIds[ids[i]];
			netId.destroy();
			this.removeNetId(netId);
		}
	};
	NetworkClient.prototype.handleMessage = function(rawData) {
		//console.info('NetworkClient.handleMessage(%s);', JSON.stringify(rawData));
		var data = JSON.parse(rawData);
		//var debugLabel = this.isClient()?'C <- S':'S <- C';
		//console.log('[%s] %s: %s', debugLabel, data.type, JSON.stringify(data.msg));
		switch(data.type) {
			case 'ping': return this.handlePing();
			case 'client.init': return this.handleClientInit(data.msg);
			case 'id.new': return this.handleIdNew(data.msg);
			case 'id.ready': return this.handleIdReady(data.msg);
			case 'id.peer': return this.handleIdPeer(data.msg);
			case 'id.destroy': return this.handleIdDestroy(data.msg);
			case 'id.msg': return this.handleIdMsg(data.msg);
			default: console.error('Invalid message:', rawData);
		}
	};
	NetworkClient.prototype.handlePing = function() {
		var msg = 'pong';
		console.log('[%s]: "%s"', debugLabel, msg);
		this.connection.send(msg);
	};
	NetworkClient.prototype.handleClientInit = function(msg) {
		//console.info('NetworkClient.handleClientInit(%s);', JSON.stringify(msg));
		this.assertClient();
		this.id = msg.id;
	};
	NetworkClient.prototype.handleIdNew = function(msg) {
		//console.info('NetworkClient.handleIdNew(%s);', JSON.stringify(msg));
		this.assertServer();
		var netId = new NetId({owner: this}).ready(Network.generateId(), msg.id);
		this.addNetId(netId);
		this.dispatchEvent('netidready', netId);
	};
	NetworkClient.prototype.handleIdReady = function(msg) {
		//console.info('NetworkClient.handleIdReady(%s);', JSON.stringify(msg));
		var netId = this.getNetId(msg.ref);
		this
			.removeNetId(netId)
			.addNetId(netId.confirm(msg.netid.id));
		this.dispatchEvent('netidready', netId);
	};
	NetworkClient.prototype.handleIdPeer = function(msg) {
		//console.info('NetworkClient.handleIdPeer(%s);', JSON.stringify(msg));
		this.assertClient();
		var netId = new NetId().confirm(msg.id);
		this.addNetId(netId);
		this.dispatchEvent('netidready', netId);
	};
	NetworkClient.prototype.handleIdDestroy = function(msg) {
		console.info('NetworkClient.handleIdDestroy(%s);', JSON.stringify(msg));
		this.assertClient();
		var netId = this.getNetId(msg.id);
		this.removeNetId(netId);
	};
	NetworkClient.prototype.handleIdMsg = function(msg) {
		//console.info('NetworkClient.handleIdMsg(%s);', JSON.stringify(msg));
		var netId = this.netIds[msg.id];
		netId.dispatchEvent('msg', msg.msg);
	};
// Info
	NetworkClient.prototype.isClient = function() {
		return this.connection.isClient;
	};
	NetworkClient.prototype.isServer = function() {
		return this.connection.isServer;
	};
// Checks
	NetworkClient.prototype.assertClient = function() {
		if(this.isClient() !== true) throw new Error('Action not available on server');
	};
	NetworkClient.prototype.assertServer = function() {
		if(this.isServer() !== true) throw new Error('Action not available on clients');
	};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = NetworkClient;
}

})();