(function() {
/*jslint node: true */
'use strict';

var jsDir = '../../www/js/';
//var XENO = require(jsDir+'xeno/XENO');
var WebSocketConnectionServer = require(jsDir+'xeno/WebSocketConnectionServer');
var NetworkServer = require(jsDir+'xeno/NetworkServer');

var DEFAULT_PORT = 82;


function getArgs() {
	var argv = process.argv.join(' '), m;
	var host;
	var port = DEFAULT_PORT;
	m = argv.match(/-p ([0-9]+)/);
	if(m) port = m[1];
	m = argv.match(/-h ([^\s]+)/);
	if(m) host = m[1];
	return {host: host, port: port};
}

function main() {
	var args = getArgs();
	var opts = {host: args.host, port: args.port};

	var server = new NetworkServer()
		.connect(new WebSocketConnectionServer().listen(opts));

	server.on('clientconnected', function(client) {
		client.on('netidready', function(netId) {
			netId.on('msg', function(msg) {
				console.log('[S <- C id.msg] %s: "%s"', this.id, msg);
				return;
				var recvId = this.id;
				this.send('Thanks!');
				var owner = this.owner;
				var peers = owner.server.clients.filter(function(peer) {
					return peer !== owner;
				});
				//console.log(peers.length);
				peers.forEach(function(peer) {
					//console.log(Object.keys(peer.netIds));
					var ids = Object.keys(peer.netIds);
				
				});	ids.forEach(function(id) {
						var netId = peer.netIds[id];
						netId.send('Did you hear?! The other player\'s netId "'+recvId+'" said: '+msg);
					});
			});
		});
	});
}

main();

})();