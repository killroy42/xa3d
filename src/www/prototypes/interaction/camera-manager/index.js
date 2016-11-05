(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var THREEPrototype = require('THREEPrototype');
var MouseHandler = require('MouseHandler');
var MouseCursor = require('MouseCursor');
var CameraManager = require('CameraManager');
var XenoCard = THREE.XenoCard = require('XenoCard');
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

// Init
	function createCards(scene, cardTex) {
		var cards = [];
		for(var i = 0; i < 20; i++) {
			var type = Math.floor(Math.random()*5);
			var card = new THREE.XenoCard(type, cardTex);
			card.position.set(
				(Math.random()*2-1)*3*cardW,
				(Math.random()*2-1)*2*cardH,
				10
			);
			snapCardPosition(card.position);
			scene.add(card);
			cards.push(card);
		}
		return cards;
	}
	function initCardCam(app, cards) {
		var mouseHandler = app.mouseHandler;
		var camera = app.camera;
		var controls = app.controls;
		var camMan = new CameraManager(camera);
		camera.up = new THREE.Vector3(0, 0, 1);

		camMan.add('main', app.camera);
		cards.forEach(function(card, idx) {
			var pos = card.position.clone().add(new THREE.Vector3(0, -280, 250));
			var target = pos.clone().add(new THREE.Vector3(0, 400, -300));
			//target.x = 0;
			camMan.add('card'+idx, pos, target);
		});

		function camReady() {
			//camera.up = new THREE.Vector3(0, 1, 0);
			app.cameraTarget = camMan.getTargetVector(camera.matrix).add(camera.position);
			controls.position0.copy(camera.position);
			controls.target0.copy(app.cameraTarget);
			app.controls.reset();
			controls.enabled = true;
		}
		function setCam(location) {
			return function() {
				leaveCam = false;
				controls.enabled = false;
				camMan.animate(location, camReady);
			};
		}

		var leaveCam = false;
		mouseHandler.addEventListener('mouseup', function(e) {
			leaveCam = true;
			setTimeout(function() {
				if(leaveCam) setCam('main')();
			}, 0);
		});
		
		var gui = new dat.GUI();
		var guiOpts = {
			'Main Camera': setCam('main')
		};
		cards.forEach(function(card, idx) {
			guiOpts['Card '+idx] = setCam('card'+idx);
			card.addEventListener('click', setCam('card'+idx));
		});
		Object.keys(guiOpts).forEach(function(key) { gui.add(guiOpts, key); });
		gui.close();
		window.addEventListener('keydown', function(e) {
			if(e.keyCode >= 48 && e.keyCode <= 57) {
				setCam('card'+(e.keyCode-48))();
			}
			else if(e.keyCode === 27) {
				setCam('main')();
			}
		});
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
			this.setCamera(new THREE.Vector3(0, -300, 1000), new THREE.Vector3(0, -80, 0));
			initLights(this);
		// Board
			var boardTex = loadTexture(boardImageUrl);
			var boardAlpha = loadTexture(boardAlphaUrl);
			scene.add(createBoard(boardTex, boardAlpha));
		// Cards
			var cardTex = loadTexture(cardImageUrl);
			var cards = createCards(scene, cardTex);
		var cardCam = initCardCam(this, cards);
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();