(function() {
'use strict';

var EventDispatcher = require('./EventDispatcher');


function Connection() {
	EventDispatcher.apply(this);
	this.isConnected = false;
	this.isClient = undefined;
	this.isServer = undefined;
}
Connection.prototype = Object.create(null);
Connection.prototype.constructor = Connection;
Connection.prototype.connect = function() {
	this.assertDisconnected();
	this.isClient = true;
	this.isServer = false;
	this.isConnected = true;
	return this;
};
Connection.prototype.disconnect = function() {
	//console.error('Connection.disconnect();');
	this.assertConnected();
	this.isConnected = false;
	return this;
};
Connection.prototype.attach = function() {
	if(this.isClient === undefined) this.isClient = false;
	if(this.isServer === undefined) this.isServer = true;
	this.isConnected = true;
	return this;
};
// Checks
	Connection.prototype.assertConnected = function() {
		if(this.isConnected !== true) throw new Error('Must be connected');
	};
	Connection.prototype.assertDisconnected = function() {
		if(this.isConnected === true) throw new Error('Must be disconnected');
	};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = Connection;
}

})();