(function() {
'use strict';

var Network = require('./Network');
var Connection = require('./Connection');


function LocalConnection() {
	Connection.apply(this);
}
LocalConnection.prototype = Object.create(Connection.prototype);
LocalConnection.prototype.constructor = LocalConnection;
LocalConnection.prototype.attach = function() {
	//console.info('LocalConnection.attach();');
	Connection.prototype.attach.call(this);
	this.dispatchEvent('connected');
	return this;
};
LocalConnection.prototype.disconnect = function(reason) {
	//console.info('LocalConnection.disconnect(reason);');
	return this;
};
LocalConnection.prototype.send = function(data) {
	//console.info('LocalConnection.send(data); S:%s, C:%s', this.isServer, this.isClient);
	//console.dir(data);
	var packet = JSON.parse(data);
	switch(packet.type) {
		// this.dispatchEvent('message', data);
		//case Network.MSG_CLIENT_INIT: break;
		//default: console.warn('  Not forwarding [%s]:', packet.type, data);
	}
	return this;
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = LocalConnection;
}

})();