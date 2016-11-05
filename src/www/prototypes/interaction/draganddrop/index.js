/*
BUGS:
DragAndDrop.js:79 Uncaught TypeError: mouseHandler.abortDrag is not a function
three_r77dev.js:2040 Uncaught TypeError: Cannot read property 'x' of undefined
DragAndDrop.js:85 Uncaught TypeError: mouseHandler.abortDrag is not a function
*/

(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var MouseHandler = require('MouseHandler');
var ForcefieldEffect = require('ForcefieldEffect');
var MouseCursor = require('MouseCursor');
var ControlsSwitcher = require('ControlsSwitcher');
var AnimationHelpers = require('AnimationHelpers');
var DragAndDrop = require('DragAndDrop');
var THREEPrototype = require('THREEPrototype');
var initLights = require('initLights');
var createBoard = require('createBoard');
var assetdata = require('assetdata');
var XenoCard3D = require('XenoCard3D');
var CardGlow = require('CardGlow');
var loadDynamicMaterials = require('loadDynamicMaterials');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var snapCardPosition = assetdata.snapCardPosition;

var cardInfo = assetdata.cardInfo;
var cardW = cardInfo.width, cardH = cardInfo.height;
var cardBoardZ = cardInfo.boardZ, cardDragZ = cardInfo.dragZ;
var boardTextureUrl = assetdata.boardTextureUrl;
var boardAlphaUrl = assetdata.boardAlphaUrl;


function createCardGlowListeners(scene, glowFlowMaterial) {
	var cardGlow = new CardGlow(glowFlowMaterial);
	scene.add(cardGlow);
	return {
		mouseenter: function() {
			cardGlow.position.copy(this.position);
			cardGlow.hover();
		},
		mouseleave: cardGlow.unhover,
		dragstart: function() {
			cardGlow.position.copy(this.position);
			cardGlow.dragstart();
		},
		drag: function() {
			cardGlow.position.copy(this.position);
		},
		dragfinish: function() {
			cardGlow.position.copy(this.position);
			cardGlow.dragfinish();
		},
		mousedown: cardGlow.mousedown,
		mouseup: cardGlow.mouseup,
	};
}

// Init Prototype
	function Prototype_init() {
		var self = this;
		var scene = this.scene;
		var loadTexture = this.getLoadTexture();
		var loadShader = this.getLoadShader();
		var boardTex = loadTexture(boardTextureUrl);
		var boardAlpha = loadTexture(boardAlphaUrl);
		var mouseHandler = new MouseHandler({
			domElement: this.renderer.domElement,
			camera: this.camera,
			scene: this.scene
		});
		var pointer = new MouseCursor({scene: this.scene}).attach(mouseHandler);
		var controlsSwitcher = new ControlsSwitcher(this.controls).attach(mouseHandler);
		var xenoCard3D = new XenoCard3D();
		var materialLoader = loadDynamicMaterials(this);
		var noiseMap = materialLoader.noiseMap.texture;
		var glowFlowMaterial = materialLoader.createGlowFlowMaterial();

		//document.documentElement.style.cursor = 'none';

		this.setCamera(new THREE.Vector3(0, -400, 1000), new THREE.Vector3(0, -90, 0));
		initLights(this);
		scene.add(createBoard(boardTex, boardAlpha));

		var dragAndDrop = new DragAndDrop({app: self, dropZ: cardBoardZ, dragZ: cardDragZ});
		dragAndDrop.attachToMouseHandler(mouseHandler);

		var cardGlowListeners = createCardGlowListeners(this.scene, glowFlowMaterial);
		dragAndDrop.on('cardattached', function(card) {
			//console.log('DnD.on(cardattached)');
			card.addEventListeners(cardGlowListeners);
		});
		dragAndDrop.on('carddetached', function(card) {
			//console.log('DnD.on(carddetached)');
			card.removeEventListeners(cardGlowListeners);
		});

		function cardHandleMeshReady() {
			if(Math.random() > 0.7) {
				var forcefield = new ForcefieldEffect(loadShader, noiseMap);
				this.add(forcefield);
			}
			dragAndDrop.attachCard(this);
		}

		var card = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
		card.position.set(0, 0, 200);
		scene.add(card);
		card.addEventListener('meshReady', cardHandleMeshReady);

		for(var i = 0; i < 20; i++) {
			card = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
			var x = (Math.random()*2-1)*3*cardW;
			var y = (Math.random()*2-1)*2*cardH;
			snapCardPosition(card.position.set(x, y, cardBoardZ));
			scene.add(card);
			card.addEventListener('meshReady', cardHandleMeshReady);
		}
		
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();