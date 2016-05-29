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

function animateCard(card) {
	console.log('animateCard(card);');
	var tl = new TimelineMax({paused: true});
	console.log(tl);

	function fx(t) {
		return 0;
	}
	function fy(t) {
		// 0->1 => 0 -> 0
		var out = Math.sin(t * Math.PI);
		console.log('fy %s -> %s', t, out);
		return out;
	}

	var lift = new TimelineMax({paused: true})
		/*
		.to(card.position, 1, {
			z: '+=40',
			ease: Power2.easeIn
		})
		.to(card.position, 2, {
			z: '+=20',
			ease: Elastic.easeOut
		})
		*/
		.to(card.position, 0.2, {
			z: '+=60',
			ease: Power4.easeOut
		});
	var idle_y = new TimelineMax({paused: true})
		.to(card.rotation, 0.5, {y: 5 * Math.PI/180, ease: Power1.easeOut})
		.to(card.rotation, 0.5, {y: 0 * Math.PI/180, ease: Power1.easeIn})
		.to(card.rotation, 0.5, {y: -5 * Math.PI/180, ease: Power1.easeOut})
		.to(card.rotation, 0.5, {y: 0 * Math.PI/180, ease: Power1.easeIn})
		//.yoyo(true)
		.repeat(3)
		;
	var idle_x = new TimelineMax({paused: true})
		.to(card.rotation, 0.5, {x: 5 * Math.PI/180, ease: Power1.easeOut})
		.to(card.rotation, 0.5, {x: 0 * Math.PI/180, ease: Power1.easeIn})
		.to(card.rotation, 0.5, {x: -5 * Math.PI/180, ease: Power1.easeOut})
		.to(card.rotation, 0.5, {x: 0 * Math.PI/180, ease: Power1.easeIn})
		//.yoyo(true)
		.timeScale(0.3)
		.repeat(3)
		;
	var idle = new TimelineMax({paused: true})
		.to({t: 0}, 1, {
			t: 1,
			//ease: Elastic.easeOut,
			onUpdate: function() {
				var t =  this.target.t;
				var a = Math.sin(t * 2 * Math.PI) * (1-t);
				//a = -1 + t;
				card.rotation.y = a * 10 * Math.PI/180;
				//card.rotation.x = (fx(t)-0.5) * 10 * Math.PI/180;
				//card.rotation.y = (fy(t)-0.5) * 10 * Math.PI/180;
			}
		})
		//.yoyo(true)
		.timeScale(1)
		.repeat(0)
		;


	var bounceAngle = 0;
	tl
		.add(lift.play())
		.eventCallback('onUpdate', function() {
			console.log('onUpdate A', bounceAngle);
			card.rotation.y = bounceAngle * 10 * Math.PI/180;
			bounceAngle = 0;
		})
		//.add('startidle')
		//.add(idle.play(), 'startidle')
		.add(TweenLite.to({}, 100, {}))
		.play()
		;
	function addBounce() {
		var invert = (Math.random() < 0.5)?-1:1;
		var duration = 0.2 + Math.random() * 1.3;
		var delay = 0.8 + Math.random() * 0.3;
		TweenLite.to({t: 0}, duration, {
			t: 1,
			onUpdate: function() {
				var t =  this.target.t;
				var a = Math.sin(invert * t * 2 * Math.PI) * (1-t);
				bounceAngle += a;
			}
		});
		setTimeout(function() { addBounce(); }, delay);
	}
	addBounce();
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
			card.camView = 'card'+idx;
			var pos = card.position.clone().add(new THREE.Vector3(0, -280, 250));
			var target = pos.clone().add(new THREE.Vector3(0, 400, -300));
			//target.x = 0;
			camMan.add(card.camView, pos, target);
		});


		var leaveCam = false;

		function cardCamReady(card) {
			//camera.up = new THREE.Vector3(0, 1, 0);
			app.cameraTarget = camMan.getTargetVector(camera.matrix).add(camera.position);
			controls.position0.copy(camera.position);
			controls.target0.copy(app.cameraTarget);
			app.controls.reset();
			//controls.enabled = true;
			mouseHandler.addEventListener('mouseup', leaveCardCam);
			animateCard(card);
		}
		function cardCam(e) {
			var card = this;
			//cards.forEach(function(card, idx) { card.removeEventListener('click', cardCam); });
			leaveCam = false;
			controls.enabled = false;
			camMan.animate(card.camView, 0.1, function() { cardCamReady(card); });
		}
		function mainCamReady() {
			//console.log('mainCamReady();');
			camera.up = new THREE.Vector3(0, 1, 0);
			app.cameraTarget = camMan.getTargetVector(camera.matrix).add(camera.position);
			controls.position0.copy(camera.position);
			controls.target0.copy(app.cameraTarget);
			app.controls.reset();
			controls.enabled = true;
			//cards.forEach(function(card, idx) { card.addEventListener('click', cardCam); });
		}
		function mainCam() {
			//console.log('mainCam();');
			mouseHandler.removeEventListener('mouseup', leaveCardCam);
			leaveCam = false;
			controls.enabled = false;
			camMan.animate('main', 0.1, mainCamReady);
		}
		function leaveCardCam() {
			leaveCam = true;
			setTimeout(function() {
				if(leaveCam) mainCam();
			}, 0);
		}

		cards.forEach(function(card, idx) { card.addEventListener('click', cardCam); });
		//mainCam();
		
		var gui = new dat.GUI();
		var guiOpts = {
			'Main Camera': mainCam
		};
		//cards.forEach(function(card, idx) { card.addEventListener('click', cardCam); });
		Object.keys(guiOpts).forEach(function(key) { gui.add(guiOpts, key); });
		gui.close();
		window.addEventListener('keydown', function(e) {
			if(e.keyCode >= 48 && e.keyCode <= 57) {
				var card = cards[e.keyCode-48];
				cardCam.call(card);
			}
			else if(e.keyCode === 27) {
				mainCam();
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