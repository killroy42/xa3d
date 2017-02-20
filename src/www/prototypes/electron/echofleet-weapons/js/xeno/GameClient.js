(function() {
'use strict';

var THREE = require('THREE');
var WebSocketConnection = require('WebSocketConnection');
var NetworkClient = require('NetworkClient');


function GameClient() {
	this.netClient = new NetworkClient();
	Object.defineProperties(this, {
		connection: { get: function() {
			return this.netClient.connection;
		} },
	});
}
GameClient.prototype = Object.create(null);
GameClient.prototype.constructor = GameClient;
GameClient.prototype.connect = function(opts) {
	var conn = new WebSocketConnection();
	conn.connect(opts);
	this.netClient.connect(conn);
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = GameClient;
}

})();