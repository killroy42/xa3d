(function() {
/*jslint node: true */
'use strict';

var jsDir = '../../www/js/';
//var XENO = require(jsDir+'xeno/XENO');
var WebSocketConnectionServer = require(jsDir+'xeno/WebSocketConnectionServer');
var Network = require(jsDir+'xeno/Network');
var NetworkServer = require(jsDir+'xeno/NetworkServer');
var NetworkClient = require(jsDir+'xeno/NetworkClient');
var LocalConnection = require(jsDir+'xeno/LocalConnection');
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

function createLocalClient(server) {
	var client = new NetworkClient();
	client.server = server;
	client.id = Network.generateId();
	server.clients.push(client);
	var connection = new LocalConnection();
	client.connect(connection);
	connection.attach();
	return client;
}

function main() {
	var args = getArgs();
	var opts = {host: args.host, port: args.port};

	var server = new NetworkServer().connect(new WebSocketConnectionServer());

	var context = {
		assetdata: assetdata
	};

	GameBlueprint.context = context;
	PlayerBlueprint.context = context;
	
	var localClient = createLocalClient(server);
	localClient.registerBlueprint('BoxBlueprint', BoxBlueprint);
	localClient.registerBlueprint('GameBlueprint', GameBlueprint);
	localClient.registerBlueprint('PlayerBlueprint', PlayerBlueprint);
	var Game = localClient.instantiateBlueprint('GameBlueprint');
	Game.on('created', function() {
		for(var i = 0; i < 14; i++) this.createCard();
	});
	context.game = Game;

	server.connectionServer.listen(opts);
	server.on('clientconnected', function(client) {
		client.registerBlueprint('BoxBlueprint', BoxBlueprint);
		client.registerBlueprint('GameBlueprint', GameBlueprint);
		client.registerBlueprint('PlayerBlueprint', PlayerBlueprint);
	});
}

main();

})();