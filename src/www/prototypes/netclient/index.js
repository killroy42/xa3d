(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var io = require('lookup');
var THREEPrototype = require('THREEPrototype');
var MouseHandler = require('MouseHandler');
var MouseCursor = require('MouseCursor');
var initLights = require('initLights');
var createBoard = require('createBoard');
var InstanceManager = require('InstanceManager');
//InstanceManager.NetObject = require('NetObject');
var ClientSocket = require('ClientSocket');
var getNetPointerClientProxyType = require('getNetPointerClientProxyType');

var boardImageUrl = '/images/xa_board_a_3.jpg';
var boardAlphaUrl = '/images/xa_board_alpha.png';


function initClient(app) {
	var scene = app.scene;
	var mouseHandler = app.mouseHandler;

	var im = new InstanceManager('client');
	im.registerType('NetPointer', getNetPointerClientProxyType(scene, mouseHandler));
	var socket = io.connect('//:81', {
		transports: ['websocket'], 
		'force new connection': true
	});
	var client = new ClientSocket(socket, im);
	var instance = im.createInstance('NetPointer', client);
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