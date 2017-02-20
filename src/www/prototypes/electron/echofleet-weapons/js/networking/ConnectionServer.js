(function() {
const EventDispatcher = require('../xeno/EventDispatcher');

function ConnectionServer() {
	EventDispatcher.apply(this);
	this.connections = [];
}
ConnectionServer.prototype = Object.create(null);
ConnectionServer.prototype.constructor = ConnectionServer;
ConnectionServer.prototype.listen = function(opts) {
	//console.info('ConnectionServer.listen(opts);');
	//this.on('connection', this.bindHandler(this.handleConnection));
	throw new Error('Abstract method invocation');
};
ConnectionServer.prototype.handleConnection = function(conn) {
	//console.info('ConnectionServer.handleConnection(conn);');
	this.connections.push(conn);
	conn.isClient = false;
	conn.isServer = true;
	this.dispatchEvent('connection', conn);
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = ConnectionServer;
}

})();