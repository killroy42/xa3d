(function() {
/*jslint node: true */
'use strict';

var http = require('http');
var NetServer = require('./NetServer.js');
var DEFAULT_PORT = 81;


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
	var app = http.createServer();
	var server = app.listen(args.port, args.host, function () {
		console.info('Card server listening on "%s:%s"', server.address().address, server.address().port);
		var netServer = new NetServer().listen(app);
	});
}

main();

})();