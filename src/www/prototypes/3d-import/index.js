(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var THREEPrototype = require('THREEPrototype');
var MouseHandler = require('MouseHandler');
var MouseCursor = require('MouseCursor');
var CameraManager = require('CameraManager');
var XenoCard3D = require('XenoCard3D');
var XenoCard = require('XenoCard');
var initLights = require('initLights');
var createBoard = require('createBoard');

var boardImageUrl = '/images/xa_board_a_3.jpg';
var boardAlphaUrl = '/images/xa_board_alpha.png';
var cardImageUrl = '/images/buttonia.jpg';
var cardW = 168, cardH = 230;


function snapCardPosition(position) {
	position.x = Math.round(position.x / cardW + 0.5)*cardW - cardW * 0.5;
	position.y = Math.round(position.y / cardH + 0.5)*cardH - cardH * 0.5;
	return position;
}

// Init Prototype
	function Prototype_init() {
		var scene = this.scene;
		var loadTexture = this.getLoadTexture();
		var loadShader = this.getLoadShader();
		var mouseHandler = new MouseHandler({
			domElement: this.renderer.domElement,
			camera: this.camera,
			scene: scene
		});
		var pointer = new MouseCursor({scene: scene}).attach(mouseHandler);
		this.mouseHandler = mouseHandler;
		// Camera & Lights
			this.setCamera(new THREE.Vector3(0, -400, 600), new THREE.Vector3(0, 50, 0));
			initLights(this);
		// Board
			var boardTex = loadTexture(boardImageUrl);
			var boardAlpha = loadTexture(boardAlphaUrl);
			scene.add(createBoard(boardTex, boardAlpha));
		// Loader
			var xenoCard3D = new XenoCard3D();

			var potraitTexDropshipUrl = 'assets/portrait_dropship.jpg';
			var potraitTexSvenheadUrl = 'assets/portrait_svenhead.jpg';

			var cardPortrait1Tex = loadTexture(potraitTexDropshipUrl);
			var cardPortrait2Tex = loadTexture(potraitTexSvenheadUrl);
			xenoCard3D.loadAssets()
			.then(function() {
				var card1 = xenoCard3D.createCard(cardPortrait1Tex);
				card1.position.set(-200, 0, 100);
				scene.add(card1);
				var card2 = xenoCard3D.createCard(cardPortrait2Tex);
				card2.position.set(200, 0, 100);
				scene.add(card2);
			});
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();