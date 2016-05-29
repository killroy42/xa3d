(function() {
'use strict';

var EventDispatcher = require('./EventDispatcher');


function Connection() {
	EventDispatcher.apply(this);
	this.isClient = false;
	this.isServer = undefined;
}
Connection.prototype = Object.create(null);
Connection.prototype.constructor = Connection;
Connection.prototype.connect = function() {
	this.isClient = true;
	this.isServer = false;
	return this;
};
Connection.prototype.disconnect = function() {
	this.isClient = false;
	this.isServer = false;
	return this;
};
Connection.prototype.attach = function() {
	if(this.isClient === undefined) this.isClient = false;
	if(this.isServer === undefined) this.isServer = true;
	return this;
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = Connection;
}

})();