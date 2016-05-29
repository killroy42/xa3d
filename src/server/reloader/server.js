(function() {
/*jslint node: true */
'use strict';

var ws = require('ws');
var WebSocketServer = ws.Server;
var DEFAULT_PORT = 7890;


function getArgs() {
	var argv = process.argv.join(' '), m;
	var args = {
		port: DEFAULT_PORT
	};
	m = argv.match(/-p ([0-9]+)/);
	if(m) args.port = m[1];
	return args;
}

function main() {
	var args = getArgs();
	var wss = new WebSocketServer({port: args.port});
	console.info('Reloader listening on "%s:%s"', wss.options.host, wss.options.port);
}

main();

})();