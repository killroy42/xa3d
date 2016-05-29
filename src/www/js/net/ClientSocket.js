(function() {
'use strict';

var NetSocket = require('./NetSocket');


function ClientSocket() {
	NetSocket.apply(this, arguments);
	this.peerType = 'client';
	this.attachClientEventHandlers();
}
ClientSocket.prototype = Object.create(NetSocket.prototype);
ClientSocket.prototype.constructor = ClientSocket;
ClientSocket.prototype.attachClientEventHandlers = function() {
	var self = this;
	var socket = this.socket;
	var im = this.instanceManager;
	function onCreateclient(data) {
		console.info('[ClientSocket] client<-server (createclient)', JSON.stringify(data));
		var instanceId = data.instance.id;
		var clientId = data.instance.clientId;
		if(clientId) {
			im.updateInstanceId(clientId, instanceId);
		} else {
			im.instantiateNetObject(data.instance.id, 'client', data.instance.type, self);
		}
	}
	function onCreateproxy(data) {
		console.info('[ClientSocket] client<-server (createproxy)', JSON.stringify(data));
		im.instantiateNetObject(data.instance.id, 'proxy', data.instance.type, self);
	}
	function onDestroyinstance(data) {
		console.info('[ClientSocket] client<-server (destroyinstance)', JSON.stringify(data));
		im.destroyInstance(data.instance.id);
	}
	socket.on('createclient', onCreateclient);
	socket.on('createproxy', onCreateproxy);
	socket.on('destroyinstance', onDestroyinstance);
};
ClientSocket.prototype.sendToServer = function(event, data) {
	console.info('ClientSocket.sendToServer(%s, %s);', JSON.stringify(event), JSON.stringify(data));
	this.socket.emit(event, data);
};


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = ClientSocket;
}

})();