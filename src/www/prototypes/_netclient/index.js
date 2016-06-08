(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var io = require('lookup');
var THREEPrototype = require('THREEPrototype');
var MouseHandler = require('MouseHandler');
var MouseCursor = require('MouseCursor');
var initLights = require('initLights');
var createBoard = require('createBoard');
var WebSocketConnection = require('WebSocketConnection');
var NetworkClient = require('NetworkClient');

var boardImageUrl = '/images/xa_board_a_3.jpg';
var boardAlphaUrl = '/images/xa_board_alpha.png';


function logNetIdMsg(msg) {
	console.log('[C <- S id.msg] %s: "%s"', this.id, msg);
}

function initClient(app) {
	var scene = app.scene;
	var mouseHandler = app.mouseHandler;
	//var client = new NetworkClient().connect(new WebSocketConnection().connect({port: 82}));
	var client = new NetworkClient().connect(new WebSocketConnection());
	client.connection.connect({port: 82});
	var gui = new dat.GUI();
	var guiOpts = {
		'Connect': function() {
			client.connection.connect({port: 82});
		},
		'Disconnect': function() {
			client.connection.disconnect();
		},
		'Add netId': function() {
			client.createNetId();
		},
		'Remove first netId': function() {
			var netId;
			var ids = Object.keys(client.netIds);
			for(var i = 0; i < ids.length; i++) {
				netId = client.getNetId(ids[i]);
				if(netId.isReady && netId.isOwner) break;
			}
			if(netId === undefined) {
				console.log('No netIds to remove');
				return;
			}
			console.log('Removing:', netId.serialize());
			netId.destroy();
		},
		'Stress Test': function() {
			setInterval(function() { console.clear(); }, 5000);
			setInterval(function() {
				switch(Math.floor(Math.random()*6)) {
					case 0:
						if(client.connection.isConnected === false) {
							console.log('CONNECT');
							client.connection.connect({port: 82});
							break;
						}
						console.log('DISCONNECT');
						client.connection.disconnect();
						break;
					case 1: case 2: case 3:
						if(client.connection.isConnected === false) {
							console.log('CONNECT');
							client.connection.connect({port: 82});
							break;
						}
						console.log('CREATE');
						client.createNetId();
						break;
					case 4: case 5:
						if(client.connection.isConnected === false) {
							console.log('CONNECT');
							client.connection.connect({port: 82});
							break;
						}
						var netIds = Object.keys(client.netIds)
						.map(function(id) { return client.getNetId(id); })
						.filter(function(netId) { return netId.isReady && netId.isOwner; });
						if(netIds.length > 0) {
							console.log('DESTROY');
							netIds[0].destroy();
						}
					break;
				}
			}, 100);
		},
	};
	Object.keys(guiOpts).forEach(function(key) { gui.add(guiOpts, key); });
	//gui.close();

	var lastReportString = '';
	setInterval(function() {
		reportString = 'Client['+client.id+']: '+
			Object.keys(client.netIds)
			.map(function(id) {
				var netId = client.netIds[id];
				return '('+netId.id+'/'+(netId.isProxy?'P':'C')+')';
			}).join(' ');
		if(reportString !== lastReportString) {
			//console.log('netIds.length:', Object.keys(client.netIds).length);
			console.log(reportString);
			lastReportString = reportString;
		}
	}, 10);
}

function Prototype_init() {
	var loadTexture = this.getLoadTexture();
	var boardTex = loadTexture(boardImageUrl);
	var boardAlpha = loadTexture(boardAlphaUrl);
	var mouseHandler = this.mouseHandler = new MouseHandler({
		domElement: this.renderer.domElement,
		camera: this.camera,
		scene: this.scene
	});
	var pointer = new MouseCursor({scene: this.scene}).attach(mouseHandler);
	this.setCamera(new THREE.Vector3(0, -400, 1000), new THREE.Vector3(0, -90, 0));
	initLights(this);
	this.scene.add(createBoard(boardTex, boardAlpha));
	initClient(this);
}

document.addEventListener('DOMContentLoaded', function init() {
	var prototype = new THREEPrototype();
	prototype.oninit = Prototype_init;
	prototype.start();
});

})();