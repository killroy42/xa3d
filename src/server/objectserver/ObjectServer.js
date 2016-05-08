(function() {
/*jslint node: true */
'use strict';

var jsDir = '../../www/js/';
var socketio = require('socket.io');
var NetObject = require(jsDir+'net/NetObject.js');


function toId(ref) { return ref.id; }


function ObjectServer() {
	this.instances = [];
}
ObjectServer.prototype = Object.create(null);
ObjectServer.prototype.constructor = ObjectServer;
ObjectServer.prototype.listen = function(app) {
	console.info('ObjectServer.listen(app);');
	var self = this;
	var io = this.io = socketio(app);
	io.on('connection', function(socket) { self.onConnection(socket); });
	var serverPointer = this.createInstance(this, 'NetPointer');
	serverPointer.position = {x: 0, y: 0, z: 0};
	setInterval(function() {
		serverPointer.position.x += -2 + Math.random() * 4;
		serverPointer.position.y += -2 + Math.random() * 4;
		self.instanceEvent(serverPointer, {type: 'mousemove', position: serverPointer.position});
	}, 100);
};
ObjectServer.prototype.createInstance = function(owner, name) {
	console.info('ObjectServer.createInstance(%s);', owner.id);
	var instances = this.instances;
	var instance = new NetObject({name: name, type: 'server', owner: owner});
	instances.push(instance);
	if(!(owner instanceof ObjectServer)) {
		owner.emit('createclient', {instance: instance});
		owner.broadcast.emit('createproxies', {instances: [instance]});
	}
	return instance;
};
ObjectServer.prototype.destroyInstances = function(client) {
	console.info('ObjectServer.destroyInstances(%s);', client.id);
	var instances = this.instances;
	client.broadcast.emit('destroyinstances', {
		instances: instances
			.filter(function(instance) { return instance.owner === client; })
			.map(toId)
	});
	this.instances = instances.filter(function(instance) { return instance.owner !== client; });
};
ObjectServer.prototype.getInstance = function(prop, val) {
	return this.instances.filter(function(instance) {
		return instance[prop] === val;
	});
};
ObjectServer.prototype.instanceEvent = function(instance, event) {
	//console.info('ObjectServer.instanceEvent(%s, %s);', instance.toString(), event);
	var self = this;
	var dropRate = 0;
	var latencyMin = 200;
	var latencyMax = 200;
	if(Math.random() > dropRate) {
		var latency = latencyMin + Math.random()*(latencyMax-latencyMin);
		setTimeout(function() {
			if(!(instance.owner instanceof ObjectServer)) {
				instance.owner.broadcast.emit('instanceevent', {id: instance.id, event: event});
				instance.owner.emit('instanceevent', {id: instance.id, event: event});
			} else {
				self.io.emit('instanceevent', {id: instance.id, event: event});
			}
		}, latency);
	}
};
ObjectServer.prototype.onConnection = function(socket) {
	console.info('ObjectServer.onConnection(%s);', socket.id);
	var self = this;
	var instances = this.instances;
	var client = socket;
	console.log('client.id:', client.id);
	client.on('disconnect', function(reason) {
		console.log('Client disconnected because: "%s"', reason);
		console.log('Destroying %s instances', instances.filter(function(instance) { return instance.owner === client; }).length);
		self.destroyInstances(client);
	});
	client.on('createinstance', function(data) { self.createInstance(client, data.name); });
	client.on('instanceevent', function(data) {
		var instance = self.getInstance('id', data.id)[0];
		if(instance.owner !== client) {
			var err = new Error('Invalid owner');
			console.error(err);
			if(client) console.info(client.id);
			console.info(instance);
			if(instance.owner) console.info(instance.owner.id);
			throw err;
		}
		self.instanceEvent(instance, data.event);
	});
	if(instances.length > 0) client.emit('createproxies', {instances: instances});
};
ObjectServer.prototype.broadcast = function(event, data) {
	this.io.emit(event, data);
};
ObjectServer.prototype.createBoundHandler = function(client, handler) {
	var self = this;
	return function(data) { self[handler](client, data); };
};
ObjectServer.prototype.__onListpeers = function(client) {
	console.info('ObjectServer.onListpeers(client);');
	client.emit('peerlist', {peers: this.clients.map(function(client) {
		return client.id;
	})});
};


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = ObjectServer;
}

})();