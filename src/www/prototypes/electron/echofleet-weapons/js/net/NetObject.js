(function() {
'use strict';
var PortableEvents = require('portable-events');


//function NetObject(instanceManager, eventHandlers, opts) {
function NetObject(id, peerType, owner) {
	console.info('new NetObject("%s", "%s", owner', id, peerType);
	var self = this;
	PortableEvents.apply(self);
	self.id = id;
	self.peerType = peerType;
	self.owner = owner;
	self.typeName = self.typeName || 'NetObject';
}
NetObject.prototype = Object.create(null);
NetObject.prototype.constructor = NetObject;
NetObject.prototype.setEventHandlers = function(eventHandlers) {
	var keys = Object.keys(eventHandlers);
	for(var i = 0, l = keys.length; i < l; i++) {
		var key = keys[i];
		this[key] = eventHandlers[key];
	}
};
NetObject.prototype.destroy = function() {
	throw new Error('NetObject.destroy() NOT IMPLEMENTED');
	//this.instanceManager.destroyInstance(this);
};
NetObject.prototype.sendEvent = function(event) {
	//console.info('NetObject.sendEvent(event);');
	switch(this.owner.peerType) {
		case 'server':
			this.owner.sendToAllClients('instanceevent', {id: this.id, event: event});
			break;
		case 'serverClient':
			this.owner.sendToAllClients('instanceevent', {id: this.id, event: event});
			break;
		case 'client':
			this.owner.sendToServer('instanceevent', {id: this.id, event: event});
			break;
	}
};
NetObject.prototype.toJSON = function() {
	return {id: this.id, type: this.typeName};
};
NetObject.prototype.toString = function() {
	return 'NetObject['+
		'id: '+this.id+
		', type: "'+this.type+'"'+
		', peerType: '+this.peerType+
		((this.owner !== undefined)?', owner: '+this.owner.id:'')+
	']';
};


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = NetObject;
}

})();