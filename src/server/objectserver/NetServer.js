(function() {
/*jslint node: true */
'use strict';

var jsDir = '../../www/js/';
var socketio = require('socket.io');
var InstanceManager = require(jsDir+'net/InstanceManager.js');
var NetObject = require(jsDir+'net/NetObject.js');
InstanceManager.NetObject = require(jsDir+'net/NetObject.js');
var NetSocket = require(jsDir+'net/NetSocket.js');
var ServerSocket = NetSocket.ServerSocket;


function getNetPointerServerType() {

	function NetPointerServer() {
		NetObject.apply(this, arguments);
		this.typeName = 'NetPointer';
		this.position = {x: 0, y: 0, z: 0};
	}
	NetPointerServer.prototype = Object.create(NetObject.prototype);
	NetPointerServer.prototype.constructor = NetPointerServer;
	NetPointerServer.prototype.onEvent = function(e) {
		if(e.position) this.position = e.position;
		this.sendEvent(e);
	};
	NetPointerServer.prototype.startWiggling = function(im) {
		var self = this;
		var instances = im.instances;
		var speed = 10;
		var wiggleInterval = setInterval(function() {
			var mid = {x: 0, y: 0, z: 0};
			var clients = Object.keys(instances)
				.map(function(id) { return instances[id]; })
				.filter(function(instance) { return instance.id !== self.id; });
			var len = clients.length;
			if(len > 0) {
				clients.forEach(function(instance) {
					mid.x += instance.position.x;
					mid.y += instance.position.y;
					mid.z += instance.position.z;
				});
				mid.x /= len;
				mid.y /= len;
				mid.z /= len;

				self.position.x += (mid.x - self.position.x) / 10;
				self.position.y += (mid.y - self.position.y) / 10;
				self.position.z += (mid.z - self.position.z) / 10;
				self.sendEvent({type: 'mousemove', position: self.position});
			}
		}, 50);
		
		self.onDestroy = function() {
			console.log('wigglePointer.onDestroy');
			clearInterval(wiggleInterval);
		};
	};
	
	return NetPointerServer;
}


function NetServer() {
	this.id = 'server';
	this.peerType = 'server';
	this.im = new InstanceManager('server');
	this.im.registerType('NetPointer', getNetPointerServerType());
	console.info('CREATE NetPointer on SERVER');
}
NetServer.prototype = Object.create(null);
NetServer.prototype.constructor = NetServer;
NetServer.prototype.sendToAllClients = function(event, data) {
	if(typeof event !== 'string') {
		data = event;
		event = 'instanceevent';
	}
	this.io.emit(event, data);
};
NetServer.prototype.listen = function(app) {
	var self = this;
	var im = this.im;
	var io = this.io = socketio(app, {transports: ['websocket']});
	io.on('connection', function(socket) {
		var client = new ServerSocket(socket, im);
		console.info('CREATE NetPointer for new client:', socket.id);
		//im.createInstance('NetPointer', client);
	});
	var wigglePointer = im.createInstance('NetPointer', this);
	wigglePointer.startWiggling(im);
	//setTimeout(function() { wigglePointer.destroy(); }, 2000);
	return this;
};



if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = NetServer;
}

})();