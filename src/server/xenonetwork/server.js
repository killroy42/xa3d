(function() {
/*jslint node: true */
'use strict';

require('nodejs-dashboard');
const jsDir = '../../www/js/';
//var XENO = require(jsDir+'xeno/XENO');
const assetdata = require(jsDir+'xenocards/assetdata');
const {
	WebSocketConnectionServer,
	NetworkServer,
} = require(jsDir+'networking');
const BoxBlueprint = require(jsDir+'networking/blueprints/BoxBlueprint.server');
const GameBlueprint = require(jsDir+'networking/blueprints/GameBlueprint.server');
const PlayerBlueprint = require(jsDir+'networking/blueprints/PlayerBlueprint.server');
const UserBlueprint = require(jsDir+'networking/blueprints/UserBlueprint.server');
const EditorBlueprint = require(jsDir+'networking/blueprints/EditorBlueprint.server');
const NetObjectBlueprint = require(jsDir+'networking/blueprints/NetObjectBlueprint.server');

const DEFAULT_PORT = 82;


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
		EditorBlueprint: EditorBlueprint,
		UserBlueprint: UserBlueprint,
		NetObjectBlueprint: NetObjectBlueprint,
	};
	server.blueprints.register(blueprints, context);
	server.connect(wsConnServer, function(client) {
		console.info('SERVER: Client(%s) connected', client.id);
	});
	var localClient = server.createLocalClient();
	context.game = localClient.instantiateBlueprint('GameBlueprint');
	context.editor = localClient.instantiateBlueprint('EditorBlueprint');
}

main();

})();