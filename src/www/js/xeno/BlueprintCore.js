(function() {
'use strict';

var Network = require('./Network');
var EventDispatcher = require('./EventDispatcher');

var PeerType = Network.PeerType;

function BlueprintCore(netId, state) {
	//console.info('new BlueprintCore(netId, %s);', JSON.stringify(state));
	EventDispatcher.apply(this);
	var self = this;
	this.state = state;
	this.peerType = PeerType.DISCONNECTED;
	Object.defineProperties(this, {
		isClient: {get: function() { return this.peerType === PeerType.CLIENT; }},
		isServer: {get: function() { return this.peerType === PeerType.SERVER; }},
		isProxy: {get: function() { return this.peerType === PeerType.PROXY; }},
	});
	Promise.resolve(netId)
	.then(function(netId) { self.initialize(netId); });
}
BlueprintCore.createBlueprint = function(name, blueprint) {
	if(blueprint === undefined) blueprint = {name: name};
	//console.info('BlueprintCore.createBlueprint("%s", blueprint{%s});', name, Object.keys(blueprint).join(', '));
	var Blueprint = function() {
		Object.defineProperties(this, { name: { value: blueprint.name } });
		BlueprintCore.apply(this, arguments);
	};
	var prototypeProperties = { constructor: {value: BlueprintCore} };
	Object.keys(blueprint).forEach(function(key) {
		prototypeProperties[key] = { value: blueprint[key], enumerable: true };
	});
	var prototype = Object.create(BlueprintCore.prototype, prototypeProperties);
	Object.defineProperties(Blueprint, {
		name: { value: blueprint.name, enumerable: true },
		prototype: { value: prototype }
	});
	return Blueprint;
};
BlueprintCore.getPeerType = function(netId) {
	if(netId.client.isClient && netId.isOwner) return PeerType.CLIENT;
	if(netId.client.isServer && netId.isOwner) return PeerType.SERVER;
	if(netId.client.isClient && netId.isProxy) return PeerType.PROXY;
	var err = new Error('BlueprintCore.getPeerType(netId) > Cannot identify PeerType');
	console.error(err);
	console.log('netId.client.isClient:', netId.client.isClient);
	console.log('netId.client.isServer:', netId.client.isServer);
	console.log('netId.isOwner:', netId.isOwner);
	console.log('netId.isProxy:', netId.isProxy);
	throw err;
};
BlueprintCore.prototype = Object.create(null);
BlueprintCore.prototype.constructor = BlueprintCore;
BlueprintCore.prototype.initialize = function(netId) {
	//console.info('BlueprintCore.initialize(NetId[%s]);', netId.id, this.name);
	var self = this;
	var name = this.name;
	this.netId = netId;
	netId.once('destroyed', function() {
		if(typeof self.OnDestroy === 'function') self.OnDestroy();
	});
	netId.on('createpeer', function(peer) {
		peer.send(Network.MSG_BP_CREATE, {netid: netId.serialize(), name: name, state: self.serialize()});
	});
	netId.on('msg', function(msg) {
		if(msg.event === 'update') {
			self.deserialize(msg.state);
			if(self.peerType === PeerType.SERVER) {
				self.updateState(true);
			}
		}
	});
	this.peerType = BlueprintCore.getPeerType(netId);
	switch(this.peerType) {
		case PeerType.CLIENT:
			if(typeof this.OnCreateClient === 'function') this.OnCreateClient();
			this.deserialize(this.state);
			var msg = {netid: netId.serialize(), name: name, state: self.serialize()};
			netId.client.send(Network.MSG_BP_CREATE, msg);
			break;
		case PeerType.SERVER:
			if(typeof this.OnCreateServer === 'function') this.OnCreateServer();
			this.deserialize(this.state);
			netId.client.sendPeers(Network.MSG_BP_CREATE, {netid: netId.serialize(), name: name, state: self.serialize()});
			break;
		case PeerType.PROXY:
			if(typeof this.OnCreateProxy === 'function') this.OnCreateProxy();
			this.deserialize(this.state);
			break;
	}
	setTimeout(function() { self.dispatchEvent('created'); }, 0);
};
BlueprintCore.prototype.updateState = function(forwardOnly) {
	//console.info('BlueprintCore.updateState(%s);', forwardOnly === true);
	var netId = this.netId;
	var serialized = this.serialize();
	var packet = {id: netId.id, msg: {event: 'update', state: this.serialize()}};
	switch(this.peerType) {
		case PeerType.CLIENT: netId.client.send(Network.MSG_NETID_MSG, packet); break;
		case PeerType.PROXY: netId.client.send(Network.MSG_NETID_MSG, packet); break;
		case PeerType.SERVER:
			if(forwardOnly !== true) netId.client.send(Network.MSG_NETID_MSG, packet);
			netId.client.sendPeers(Network.MSG_NETID_MSG, packet);
			break;
	}
};
BlueprintCore.prototype.serialize = function() {
	//console.info('BlueprintCore.serialize();');
	var serialized = this.state;
	if(typeof this.OnSerialize === 'function') serialized = this.OnSerialize(this.state);
	return serialized;
};
BlueprintCore.prototype.deserialize = function(serialized) {
	//console.info('BlueprintCore.deserialize(%s);', JSON.stringify(serialized));
	this.state = serialized;
	if(typeof this.OnDeserialize === 'function') this.OnDeserialize(this.state);
	return this;
};
BlueprintCore.prototype.toString = function() {
	return this.name+' {'+
		'netId: '+this.netId.id+
	'};';
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = BlueprintCore;
}

})();