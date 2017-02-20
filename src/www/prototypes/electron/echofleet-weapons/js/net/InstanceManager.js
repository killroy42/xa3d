(function() {
'use strict';
var uuid = require('portable-uuid');


function toId(ref) { return ref.id; }


function InstanceManager(peerType) {
	this.peerType = peerType || InstanceManager.PEERTYPE_NONE;
	this.types = [];
	this.instances = {};
}
InstanceManager.PEERTYPE_NONE = 'none';
InstanceManager.PEERTYPE_CLIENT = 'client';
InstanceManager.PEERTYPE_SERVER = 'server';
InstanceManager.prototype = Object.create(null);
InstanceManager.prototype.constructor = InstanceManager;
InstanceManager.prototype.registerType = function(name, typeDef) {
	//console.info('InstanceManager.registerType("%s", typeDef);', name);
	this.types[name] = typeDef;
};
InstanceManager.prototype.get = function(id) {
	return this.instances[id];
};
InstanceManager.prototype.find = function(prop, val) {
	var instances = this.instances;
	return Object.keys(instances)
		.map(function(instanceId) { return instances[instanceId]; })
		.filter(function(instance) { return instance[prop] === val; });
};
InstanceManager.prototype.createInstance = function(typeName, owner) {
	//console.info('InstanceManager.createInstance("%s", owner);', typeName);
	//console.log('im.peerType: "%s"', this.peerType);
	//console.log('owner.peerType: "%s"', owner.peerType);
	var peerType = this.peerType;	
	var instance = this.instantiateNetObject(null, peerType, typeName, owner);
	switch (owner.peerType) {
		case 'client':
			owner.sendToServer('createinstance', {instance: instance});
			break;
		case 'serverClient':
			owner.sendToClient('createclient', {instance: instance});
			owner.sendToPeers('createproxy', {instance: instance});
			break;
		case 'server':
			owner.sendToAllClients('createproxy', {instance: instance});
			break;
		default: throw new Error('Unknown owner.peerType: ' + owner.peerType);
	}
	return instance;
};
InstanceManager.prototype.destroyInstance = function(instance) {
	if(typeof instance === 'string') instance = this.get(instance);
	//console.info('InstanceManager.destroyInstance(%s);', instance.id);
	instance.trigger('destroy');
	if(typeof instance.onDestoy === 'function') instance.onDestoy();
	delete this.instances[instance.id];
	//instance.trigger('destroy');
};
InstanceManager.prototype.destroyInstances = function(ids) {
	//console.info('InstanceManager.destroyInstances([%s]);', ids.join(', '));
	if(this.instances.length === 0) return;
	var self = this;
	var instancesToBeDestroyed = this.instances
		.filter(function(instance) { return ids.indexOf(instance.id) !== -1; });
	instancesToBeDestroyed.forEach(function(instance) { self.destroyInstance(instance); });
};
InstanceManager.prototype.updateInstanceId = function(clientId, instanceId) {
	var instances = this.instances;
	var instance = this.instances[clientId];
	if(instance === undefined) throw new Error('Instance not found for clientId: '+clientId);	
	//console.info('  Confirm instantiation of %s as %s', instance.id, instanceId);
	delete instances[instance.id];
	instance.id = instanceId;
	instances[instance.id] = instance;
};
InstanceManager.prototype.instantiateNetObject = function(instanceId, peerType, typeName, owner) {
	if(typeof instanceId !== 'string') instanceId = uuid();
	console.info('InstanceManager.instantiateNetObject(%s, "%s", "%s", owner);', instanceId, peerType, typeName);
	console.log('  instanceId:', instanceId);
	console.log('  peerType:', peerType);
	console.log('  typeName:', typeName);
	if(instanceId === undefined) throw new Error('instanceId undefined');
	if(this.instances[instanceId] !== undefined) throw new Error('Instance already exists at instanceId: '+instanceId);
	var NetObjectType = this.types[typeName];
	if(NetObjectType === undefined) throw new Error('Invalid type: "'+typeName+'"');
	//var instance = new InstanceManager.NetObject(instanceId, peerType, owner, typeName, typeHandlers);
	var instance = new NetObjectType(instanceId, peerType, owner);
	this.instances[instanceId] = instance;
	//console.log('INSTANTIATE > instances: %s', Object.keys(this.instances).length);

	//console.log('InstanceManager.instantiateNetObject > NetObject.trigger("create'+instance.peerType+'");');
	//instance.trigger('create');

	var createHandlerName = 'onCreate'+peerType;
	if(typeof instance[createHandlerName] === 'function') instance[createHandlerName]();
	instance.trigger('create');

	return instance;
};


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = InstanceManager;
}

})();