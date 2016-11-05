(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var THREEPrototype = require('THREEPrototype');
var MouseHandler = require('MouseHandler');
var MouseCursor = require('MouseCursor');
var ControlsSwitcher = require('ControlsSwitcher');
var initLights = require('initLights');
var createBoard = require('createBoard');
var assetdata = require('assetdata');
var WebSocketConnection = require('WebSocketConnection');
var NetworkClient = require('NetworkClient');
var GameClient = require('GameClient');
var BoxBlueprint = require('BoxBlueprint');
var CardBlueprint = require('CardBlueprint');
var GameBlueprint = require('GameBlueprint');
var PlayerBlueprint = require('PlayerBlueprint');
var XenoCard3D = require('XenoCard3D');
var loadDynamicMaterials = require('loadDynamicMaterials');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var cardInfo = assetdata.cardInfo;
var cardW = cardInfo.width, cardH = cardInfo.height;
var cardBoardZ = cardInfo.boardZ, cardDragZ = cardInfo.dragZ;
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
	var xenoCard3D = new XenoCard3D();
	var materials = loadDynamicMaterials(this);

	this.setCamera(new THREE.Vector3(0, -400, 1000), new THREE.Vector3(0, -90, 0));
	initLights(this);
	this.scene.add(createBoard(boardTex, boardAlpha));
	
	var gameClient = new GameClient();
	var context = {
		app: this,
		materials: materials,
		scene: scene,
		loadTexture: loadTexture,
		xenoCard3D: xenoCard3D
	};
	var blueprints = {
		BoxBlueprint: BoxBlueprint,
		CardBlueprint: CardBlueprint,
		GameBlueprint: GameBlueprint,
		PlayerBlueprint: PlayerBlueprint,
	};
	gameClient.netClient.registerBlueprint(blueprints, context);
	gameClient.connect({port: 82});
	gameClient.connection.on('connected', function() {
		var player = gameClient.netClient.instantiateBlueprint('PlayerBlueprint');
	});
}

document.addEventListener('DOMContentLoaded', function init() {
	var prototype = new THREEPrototype();
	prototype.oninit = Prototype_init;
	prototype.start();
});

})();