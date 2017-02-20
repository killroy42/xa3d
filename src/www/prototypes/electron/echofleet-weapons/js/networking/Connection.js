(function() {
const EventDispatcher = require('../xeno/EventDispatcher');

class Connection {
	constructor() {
		EventDispatcher.apply(this);
		this.isConnected = false;
		this.isClient = undefined;
		this.isServer = undefined;
	}
	connect() {
		this.assertDisconnected();
		this.isClient = true;
		this.isServer = false;
		this.isConnected = true;
		return this;
	}
	disconnect() {
		this.assertConnected();
		this.isConnected = false;
		return this;
	}
	attach() {
		if(this.isClient === undefined) this.isClient = false;
		if(this.isServer === undefined) this.isServer = true;
		this.isConnected = true;
		return this;
	}
	assertConnected() {
		if(this.isConnected !== true) throw new Error('Must be connected');
	}
	assertDisconnected() {
		if(this.isConnected === true) throw new Error('Must be disconnected');
	}
}

if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = Connection;
}
})();