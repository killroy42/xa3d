(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var DynamicShaderMaterial = require('DynamicShaderMaterial');
var MaterialRenderer = require('MaterialRenderer');
var MouseHandler = require('MouseHandler');
var XenoCard = require('XenoCard');
var ForcefieldEffect = require('ForcefieldEffect');
var MouseCursor = require('MouseCursor');
var THREEPrototype = require('THREEPrototype');
var initLights = require('initLights');
var initDynamicMaterials = require('initDynamicMaterials');
var createBoard = require('createBoard');

var boardImageUrl = '/images/xa_board_a_3.jpg';
var boardAlphaUrl = '/images/xa_board_alpha.png';
var cardImageUrl = '/images/buttonia.jpg';
var cardBoardZ = 10, cardDragZ = 300;
var cardW = 168, cardH = 230;


function snapDropPosition(position) {
	position.x = Math.round(position.x / cardW + 0.5)*cardW - cardW * 0.5;
	position.y = Math.round(position.y / cardH + 0.5)*cardH - cardH * 0.5;
	return position;
}

function createCards(scene, cardTex) {
	for(var i = 0; i < 20; i++) {
		var type = Math.floor(Math.random()*5);
		var card = new XenoCard(type, cardTex);
		card.position.set(
			(Math.random()*2-1)*3*cardW,
			(Math.random()*2-1)*2*cardH,
			cardBoardZ
		);
		snapDropPosition(card.position);
		scene.add(card);
	}
}
	
// Init Prototype
	function Prototype_init() {
		var scene = this.scene;
		var loadTexture = this.getLoadTexture();
		var loadShader = this.getLoadShader();
		var boardTex = loadTexture(boardImageUrl);
		var boardAlpha = loadTexture(boardAlphaUrl);
		var cardTex = loadTexture(cardImageUrl);
		var mouseHandler = new MouseHandler({
			domElement: this.renderer.domElement,
			camera: this.camera,
			scene: this.scene
		});
		var pointer = new MouseCursor({scene: this.scene}).attach(mouseHandler);

		this.setCamera(new THREE.Vector3(0, -400, 1000), new THREE.Vector3(0, -90, 0));
		initLights(this);
		initDynamicMaterials(this);

		scene.add(createBoard(boardTex, boardAlpha));
				
		createCards(scene, cardTex);
		var cards = scene.children.filter(function(o) { return o instanceof XenoCard; });

		var noiseMap = this.noiseMap;
		cards.forEach(function(card) {
			var forcefield = new ForcefieldEffect(loadShader, noiseMap);
			card.add(forcefield);
		});
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();