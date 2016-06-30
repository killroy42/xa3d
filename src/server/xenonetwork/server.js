(function() {
/*jslint node: true */
'use strict';

var jsDir = '../../www/js/';
//var XENO = require(jsDir+'xeno/XENO');
var WebSocketConnectionServer = require(jsDir+'xeno/WebSocketConnectionServer');
var Network = require(jsDir+'xeno/Network');
var NetworkServer = require(jsDir+'xeno/NetworkServer');
var NetworkClient = require(jsDir+'xeno/NetworkClient');
var BoxBlueprint = require(jsDir+'xeno/blueprints/BoxBlueprint.server');
var GameBlueprint = require(jsDir+'xeno/blueprints/GameBlueprint.server');
var PlayerBlueprint = require(jsDir+'xeno/blueprints/PlayerBlueprint.server');
var assetdata = require(jsDir+'xenocards/assetdata');

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
	var server = new NetworkServer();
	var wsConnServer = new WebSocketConnectionServer().listen(opts);
	var context = { assetdata: assetdata };
	var blueprints = {
		BoxBlueprint: BoxBlueprint,
		GameBlueprint: GameBlueprint,
		PlayerBlueprint: PlayerBlueprint,
	};
	server.blueprints.register(blueprints, context);
	server.connect(wsConnServer, function(client) {
		console.info('SERVER: Client(%s) connected', client.id);
	});
	var localClient = server.createLocalClient();
	context.game = localClient.instantiateBlueprint('GameBlueprint');
}

main();

})();