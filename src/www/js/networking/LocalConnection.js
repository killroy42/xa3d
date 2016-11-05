(function() {
const Connection = require('./Connection');

class LocalConnection extends Connection {
	attach() {
		//console.info('LocalConnection.attach();');
		super.attach();
		this.dispatchEvent('connected');
		return this;
	}
	disconnect(reason) {
		//console.info('LocalConnection.disconnect(reason);');
		return this;
	}
	send(data) {
		//console.info('LocalConnection.send(data); S:%s, C:%s', this.isServer, this.isClient);
		//console.dir(data);
		var packet = JSON.parse(data);
		/*
		switch(packet.type) {
			// this.dispatchEvent('message', data);
			//case Network.MSG_CLIENT_INIT: break;
			//default: console.warn('  Not forwarding [%s]:', packet.type, data);
		}
		*/
		return this;
	}
}

if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = LocalConnection;
}
})();