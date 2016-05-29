/*
BUGS:
DragAndDrop.js:79 Uncaught TypeError: mouseHandler.abortDrag is not a function
three_r77dev.js:2040 Uncaught TypeError: Cannot read property 'x' of undefined
DragAndDrop.js:85 Uncaught TypeError: mouseHandler.abortDrag is not a function
*/

(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var MaterialRenderer = require('MaterialRenderer');
var DynamicMaterialManager = require('DynamicMaterialManager');
var MouseHandler = require('MouseHandler');
var ForcefieldEffect = require('ForcefieldEffect');
var MouseCursor = require('MouseCursor');
var ControlsSwitcher = require('ControlsSwitcher');
var DragAndDrop = require('DragAndDrop');
var THREEPrototype = require('THREEPrototype');
var createNoiseTexture = require('createNoiseTexture');
var createGlowFlowTexture = require('createGlowFlowTexture');
var createGlowFlowMaterial = require('createGlowFlowMaterial');
var initLights = require('initLights');
var createBoard = require('createBoard');
var assetdata = require('assetdata');
var XenoCard3D = require('XenoCard3D');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var snapCardPosition = assetdata.snapCardPosition;
var cardInfo = assetdata.cardInfo;
var cardW = cardInfo.width, cardH = cardInfo.height;
var cardBoardZ = cardInfo.boardZ, cardDragZ = cardInfo.dragZ;
var boardTextureUrl = assetdata.boardTextureUrl;
var boardAlphaUrl = assetdata.boardAlphaUrl;
	
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

		document.documentElement.style.cursor = 'none';

		this.setCamera(new THREE.Vector3(0, -400, 1000), new THREE.Vector3(0, -90, 0));
		initLights(this);
		scene.add(createBoard(boardTex, boardAlpha));

		var dMM = new DynamicMaterialManager(this.renderer);
		var noiseMap = MaterialRenderer.createRenderTarget(512, 512);
		var noiseTexture = createNoiseTexture(loadShader);
		dMM.add('perlinNoise', noiseTexture, noiseMap);
		var glowFlowMap = MaterialRenderer.createRenderTarget(512, 512);
		var glowFlowTexture = createGlowFlowTexture(loadShader);
		dMM.add('glowFlowTexture', glowFlowTexture, glowFlowMap);
		this.onupdate = dMM.update;
		this.onrender = dMM.render;

		var dragAndDrop = new DragAndDrop({app: self, dropZ: cardBoardZ, dragZ: cardDragZ});
		dragAndDrop.glowFlowMaterial = createGlowFlowMaterial(loadShader, glowFlowMap.texture, new THREE.Color(0xffff00));
		dragAndDrop.attachToMouseHandler(mouseHandler);

		function cardHandleMeshReady() {
			if(Math.random() > 0.7) {
				var forcefield = new ForcefieldEffect(loadShader, noiseMap.texture);
				this.add(forcefield);
			}
			dragAndDrop.attachCard(this);
		}

		function animatePosition(position, vector, duration, easing) {
			duration = duration || 0.1;
			easing = easing || Power4.easeOut;
			//console.info('XenoCard.animatePosition(%s, %s, %s, easing);', position.toString(), vector.toString(), duration);
			return TweenMax.to({t: 0}, duration, {
				t: 1, ease: easing,
				onUpdate: function() {
					var progress = this.target.t;
					position.copy(vector);
					position.multiplyScalar(-(1-progress));
				}
			});
		}

		XenoCard_animateMesh = function(moveVector, snap) {
			var mesh = this.mesh;
			if(snap === undefined) snap = true;
			if(this.meshTween) {
				this.meshTween.kill();
			}
			mesh.position.sub(moveVector);
			var meshVector = mesh.position.clone().negate();
			//this.meshTween = XenoCard.animatePosition(mesh.position, meshVector, 5, Power0.easeNone);
			if(snap) {
				this.meshTween = animatePosition(mesh.position, moveVector, 0.1, Power4.easeOut);
			} else {
				this.meshTween = animatePosition(mesh.position, moveVector, 0.3, Power1.easeInOut);
			}
		};


		var card = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
		card.position.set(0, 0, 200);
		scene.add(card);
		card.animateMesh = XenoCard_animateMesh;
		card.addEventListener('meshReady', cardHandleMeshReady);

		for(var i = 0; i < 20; i++) {
			card = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
			var x = (Math.random()*2-1)*3*cardW;
			var y = (Math.random()*2-1)*2*cardH;
			snapCardPosition(card.position.set(x, y, cardBoardZ));
			scene.add(card);
			card.animateMesh = XenoCard_animateMesh;
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