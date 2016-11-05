(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var THREEPrototype = require('THREEPrototype');
var MouseHandler = require('MouseHandler');
var MouseCursor = require('MouseCursor');
var ControlsSwitcher = require('ControlsSwitcher');
var initLights = require('initLights');
var assetdata = require('assetdata');
var createBoard = require('createBoard');
var WebSocketConnection = require('WebSocketConnection');
var NetworkClient = require('NetworkClient');
var GameClient = require('GameClient');
var BoxBlueprint = require('BoxBlueprint');

var boardTextureUrl = assetdata.boardTextureUrl;
var boardAlphaUrl = assetdata.boardAlphaUrl;


function Prototype_init() {
	var scene = this.scene;
	var loadTexture = this.getLoadTexture();
	var boardTex = loadTexture(boardTextureUrl);
	var boardAlpha = loadTexture(boardAlphaUrl);
	var mouseHandler = this.mouseHandler = new MouseHandler({
		domElement: this.renderer.domElement,
		camera: this.camera,
		scene: this.scene
	});
	var pointer = new MouseCursor({scene: this.scene}).attach(mouseHandler);
	var controlsSwitcher = new ControlsSwitcher(this.controls).attach(mouseHandler);
	this.setCamera(new THREE.Vector3(0, -400, 1000), new THREE.Vector3(0, -90, 0));
	initLights(this);
	this.scene.add(createBoard(boardTex, boardAlpha));
	
	var gameClient = new GameClient();
	var netClient = gameClient.netClient;
	BoxBlueprint.context = {
		scene: scene
	};

	netClient.registerBlueprint('BoxBlueprint', BoxBlueprint);
	gameClient.connect({port: 82});
	gameClient.connection.on('connected', function() {
		console.info('GameClient connected');
		var boxOpts = {
			color: parseInt('0x'+
				Math.floor(Math.random()*256).toString(16)+
				Math.floor(Math.random()*256).toString(16)+
				Math.floor(Math.random()*256).toString(16)),
			position: {
				x: Math.random()*400 - 200,
				y: Math.random()*400 - 200,
				z: 0
			},
			velocity: {
				x: Math.random()*20 - 10,
				y: Math.random()*20 - 10,
				z: 0				
			}
		};
		var box = netClient.instantiateBlueprint('BoxBlueprint', boxOpts);
	});
}

document.addEventListener('DOMContentLoaded', function init() {
	var prototype = new THREEPrototype();
	prototype.oninit = Prototype_init;
	prototype.start();
});

})();