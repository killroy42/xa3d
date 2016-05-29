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
	var gui = new dat.GUI();
	var guiOpts = {
		'Connect': function() {
			client.connection.connect({port: 82});
		},
		'Disconnect': function() {
			client.connection.disconnect();
		},
		'Add netId': function() {
			var netId = client.createNetId();
			netId.on('ready', function() {
				//console.info('netId.on(ready) id = %s', this.id);
				this.send('Hello World');
			});
			netId.on('msg', logNetIdMsg);
		},
	};
	Object.keys(guiOpts).forEach(function(key) { gui.add(guiOpts, key); });
	//gui.close();


	client.connection.on('connected', function() {
		//console.info('index.js > client.on(connected)');
		/*
		var netId1 = client.createNetId();
		netId1.on('ready', function() {
			console.info('netId.on(ready) id = %s', this.id);
			this.send('Hello World');
		});
		netId1.on('msg', logNetIdMsg);
		var netId2 = client.createNetId();
		netId2.on('msg', logNetIdMsg);
		*/
	});
	var lastReportString = '';
	setInterval(function() {
		reportString = 'Client['+client.id+']: '+
			Object.keys(client.netIds)
			.map(function(id) {
				var netId = client.netIds[id];
				return '('+netId.id+'/'+(netId.isProxy()?'P':'C')+')';
			}).join(' ');
		if(reportString !== lastReportString) {
			//console.log('netIds.length:', Object.keys(client.netIds).length);
			console.log(reportString);
			lastReportString = reportString;
		}
	}, 100);
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