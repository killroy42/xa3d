(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var MaterialRenderer = require('MaterialRenderer');
var DynamicShaderMaterial = require('DynamicShaderMaterial');
var DynamicMaterialManager = require('DynamicMaterialManager');
var THREEPrototype = require('THREEPrototype');
var GeometryHelpers = require('GeometryHelpers');
var MouseHandler = require('MouseHandler');
var MouseCursor = require('MouseCursor');
var ForcefieldEffect = require('ForcefieldEffect');
var CardGlow = require('CardGlow');
var initLights = require('initLights');
var createBoard = require('createBoard');
var assetdata = require('assetdata');
var XenoCard3D = require('XenoCard3D');
var loadDynamicMaterials = require('loadDynamicMaterials');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var snapCardPosition = assetdata.snapCardPosition;
var cardInfo = assetdata.cardInfo;
var cardW = cardInfo.width, cardH = cardInfo.height;
var boardTextureUrl = assetdata.boardTextureUrl;
var boardAlphaUrl = assetdata.boardAlphaUrl;
var cardImageUrl = '/images/buttonia.jpg';


function makeEffectNone() {
	return function(card) {
	};
}

function makeEffectForceField(forcefieldMaterial) {
	return function(card) {
		var forcefield = new ForcefieldEffect(forcefieldMaterial);
		card.add(forcefield);
	};
}

function makeEffectCardGlow(createGlowFlowMaterial, color, scale) {
	return function(card) {
		var cardGlow = new CardGlow(createGlowFlowMaterial());
		cardGlow.hover();
		cardGlow.properties.color.to(color, 0);
		cardGlow.properties.scale.to(scale, 0);
		card.add(cardGlow);
		card.addEventListener('mouseenter', function() {
			cardGlow.properties.scale.to('normal');
		});
		card.addEventListener('mouseleave', function() {
			cardGlow.properties.scale.to('small');
		});
	};
}

function makeEffectCardGlowInteractive(createGlowFlowMaterial) {
	return function(card) {
		var cardGlow = new CardGlow(createGlowFlowMaterial());
		cardGlow.hover();
		cardGlow.properties.color.to('green', 0);
		card.add(cardGlow);
		card.addEventListener('mouseenter', function() {
			cardGlow.properties.color.to('yellow');
			cardGlow.properties.scale.to('big');
		});
		card.addEventListener('mouseleave', function() {
			cardGlow.properties.color.to('yellow');
			cardGlow.properties.scale.to('normal');
		});
		card.addEventListener('mousedown', function() {
			cardGlow.properties.color.to('red');
			cardGlow.properties.scale.to('small');
		});
		card.addEventListener('mouseup', function() {
			cardGlow.properties.color.to('yellow');
			cardGlow.properties.scale.to('big');
		});
	};
}


// Init Prototype
	function Prototype_init() {
		var mouseHandler = new MouseHandler({
			domElement: this.renderer.domElement,
			camera: this.camera,
			scene: this.scene
		});
		var pointer = new MouseCursor({scene: this.scene}).attach(mouseHandler);
		var scene = this.scene;
		var loadTexture = this.getLoadTexture();
		var loadShader = this.getLoadShader();
		var xenoCard3D = new XenoCard3D();
		var materialLoader = loadDynamicMaterials(this);
		var forcefieldMaterial = materialLoader.createForceFieldMaterial();
		var createGlowFlowMaterial = materialLoader.createGlowFlowMaterial;

		// Camera & Lights
			this.setCamera(new THREE.Vector3(0, -300, 600), new THREE.Vector3(0, -40, 0));
			initLights(this);
		// Board
			var boardTex = loadTexture(boardTextureUrl);
			var boardAlpha = loadTexture(boardAlphaUrl);
			scene.add(createBoard(boardTex, boardAlpha));
		// Effects
			[
				makeEffectForceField(forcefieldMaterial),
				makeEffectCardGlowInteractive(createGlowFlowMaterial),
				makeEffectCardGlow(createGlowFlowMaterial, 'red', 'small'),
				makeEffectCardGlow(createGlowFlowMaterial, 'red', 'normal'),
				makeEffectCardGlow(createGlowFlowMaterial, 'red', 'big'),
			].forEach(function(initEffect, idx, arr) {
				var x = (idx - 0.5 * (arr.length - 1)) * 168;
				var card = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
				card.position.set(x, 115, 20);
				initEffect(card);
				scene.add(card);
			});
			[0x3dc2ff, 0xe3ae00, 0x199f02, 0x6c324d, 0xf0bb99,0xed3a38]
			.map(function(colorHex) {
				return makeEffectCardGlow(createGlowFlowMaterial, new THREE.Color(colorHex), 'small');
			})
			.forEach(function(initEffect, idx, arr) {
				var x = (idx - 0.5 * (arr.length - 1)) * 168;
				var card = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
				card.position.set(x, -115, 20);
				initEffect(card);
				scene.add(card);
			});
	}

	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();