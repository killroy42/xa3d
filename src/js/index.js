(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var THREEPrototype = require('THREEPrototype');
var MouseHandler = THREE.MouseHandler = require('MouseHandler');
var XenoCard = THREE.XenoCard = require('XenoCard');	
var DragAndDrop = require('DragAndDrop');	

var bgImageUrl = 'images/xa_logo_bg_720p.jpg'; //'https://dl.dropboxusercontent.com/s/chztu2r4te9jlpy/xa_logo_bg_720p.jpg';
var boardImageUrl = 'images/xa_board_a_3.jpg'; //https://dl.dropboxusercontent.com/s/azi5swa368wrw8u/xa_board_a_3.jpg';
var boardAlphaUrl = 'images/xa_board_alpha.png'; //'https://dl.dropboxusercontent.com/s/hibx78j739du628/xa_board_alpha.png';
var cardImageUrl = 'images/buttonia.jpg'; //'https://dl.dropboxusercontent.com/s/0twvukrv4duyodh/buttonia.jpg';	

var cssBackground = '#000 no-repeat center/cover url('+bgImageUrl+')';
var cardBoardZ = 10;
var cardDragZ = 300;
	
var cardW = 168, cardH = 230;
var prototype = new THREEPrototype({background: cssBackground});

function snapDropPosition(position) {
	position.x = Math.round(position.x / cardW + 0.5)*cardW - cardW * 0.5;
	position.y = Math.round(position.y / cardH + 0.5)*cardH - cardH * 0.5;
	return position;
}

function animatePosition(position, vector, duration, easing) {
	duration = duration || 0.1;
	easing = easing || Power4.easeOut;
	TweenMax.to({t: 0}, duration, {
		t: 1, ease: easing,
		onUpdate: function() {
			var progress = this.target.t;
			position.copy(vector);
			position.multiplyScalar(-(1-progress));
		}
	});
}

function CardMover(opts) {
	this.card = opts.card;
}
	
// Init
	function initCamera(camera, controls) {
		camera.position.set(0, -400, 1000);
		var cameraTarget = new THREE.Vector3(0, -90, 0);
		camera.lookAt(cameraTarget);
		controls.target0.copy(cameraTarget);
		controls.reset();
	}
	function createLights(scene) {
		var ambientLight = new THREE.AmbientLight(0x404040);
		var spotLight = new THREE.SpotLight(0xffffff, 1, 1700, 45 * Math.PI/180, 1, 0.1);
		spotLight.position.set(200, 200, 1200);
		spotLight.target.position.set(100, 0, 0);
		spotLight.castShadow = true;
		spotLight.shadow.bias = -0.000001;
		spotLight.shadow.camera.near = 1;
		spotLight.shadow.camera.far = 2000;
		spotLight.shadow.camera.fov = 75;
		spotLight.shadow.mapSize.width = 2048;
		spotLight.shadow.mapSize.height = 2048;
		scene.add(ambientLight);
		scene.add(spotLight);
		return scene;
	}
	function createBoard(loadTexture) {
		var boardTex = loadTexture(boardImageUrl);
		var boardAlpha = loadTexture(boardAlphaUrl);
		var board = new THREE.Object3D();
		board.name = 'Board';
		var boardMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(1440, 1060),
			new THREE.MeshPhongMaterial({color: 0xff00ff})
		);
		boardMesh.receiveShadow = true
		board.add(boardMesh);
		boardMesh.position.set(0, -50, 0);	
		boardMesh.material.color.setHex(0xffffff);
		boardMesh.material.transparent = true;
		boardTex.minFilter = THREE.LinearFilter;
		boardMesh.material.map = boardTex;
		if(boardAlpha) {
			boardAlpha.minFilter = THREE.LinearFilter;
			boardMesh.material.alphaMap = boardAlpha;
		}
		//board.material.lightMap = alpha;
		//board.material.specular = 0xff0000;
		boardMesh.material.needsUpdate = true;
		return board;
	}
	function createCard(loadTexture, type) {
		var cardTex = loadTexture(cardImageUrl);
		cardTex.minFilter = THREE.LinearFilter;
		cardTex.repeat.y = 1/5;
		cardTex.offset.y = (4-type)/5;
		var card = new THREE.XenoCard(cardTex);
		return card;
	}
	function initCards(loadTexture, scene) {
		for(var i = 0; i < 20; i++) {
			var type = Math.floor(Math.random()*5);
			var card = createCard(loadTexture, type);
			card.position.set(
				(Math.random()*2-1)*3*cardW,
				(Math.random()*2-1)*2*cardH,
				cardBoardZ
			);
			snapDropPosition(card.position);
			scene.add(card);
		}
	}

	function initGUI(prototype) {
		var gui = new dat.GUI({});
		var mouseHandler = prototype.scene.children
			.filter(function(child) { return child instanceof MouseHandler; })[0];
		function getCards() {
			var cards = mouseHandler.children
				.filter(function(child) { return child instanceof XenoCard; });
			return cards;
		}
		
		function aimCard() {
			leaveGrabMode();
			var card = this;
			var mesh = card.mesh;
			var liftVector = new THREE.Vector3(0, 0, 100);
			card.position.add(liftVector);
			mesh.position.sub(liftVector);
			animatePosition(mesh.position, liftVector, 1);
			TweenMax.to(card.position, 1, {
				z: '+=50',
				ease: Power2.easeInOut,
				repeat: -1, yoyo: true
			});
			mouseHandler.addEventListener('mousemove', function(e) {
				if(e.intersection) {
					//console.log(e.intersection.point.toString());
					var m1 = new THREE.Matrix4();
					var m2 = new THREE.Matrix4();
					m1.lookAt(card.position, e.intersection.point, new THREE.Vector3(0, 0, 1));
					m2.makeRotationX(-90 * Math.PI / 180);
					m1.multiply(m2);
					card.quaternion.setFromRotationMatrix(m1);
				}
			});
		}
		function enterGrabMode() {
			var cards = getCards();
			prototype.controls.enabled = false;
			cards.forEach(function(card) {
				card.mesh.draggable = false;
				card.addEventListener('mousedown', aimCard);
			});
		}
		function leaveGrabMode() {
			var cards = getCards();
			prototype.controls.enabled = true;
			cards.forEach(function(card) {
				//card.mesh.draggable = true;
				card.removeEventListener('mousedown', aimCard);
			});
		}
		
		var shiftInterval;
		var opts = {
			'start shuffle': function() {
				var cards = getCards();
				function shiftCard() {
					var card = cards[Math.floor(Math.random()*cards.length)];
					var targetPos = new THREE.Vector3(
						(Math.random()*2-1)*3*cardW,
						(Math.random()*2-1)*2*cardH,
						cardBoardZ
					);
					snapDropPosition(targetPos);
					var v = [
						card.position.clone(),
						card.position.clone(),
						targetPos.clone(),
						targetPos.clone(),
					];
					
					v[1].x = v[0].x + (v[3].x - v[0].x) * 0.25;
					v[1].y = v[0].y + (v[3].y - v[0].y) * 0.25;
					v[1].z = cardDragZ;
					
					v[2].x = v[0].x + (v[3].x - v[0].x) * 0.75;
					v[2].y = v[0].y + (v[3].y - v[0].y) * 0.75;
					v[2].z = cardDragZ;
					
					/*
					function curveToLine(curve, color) {
						var geometry = new THREE.Geometry();
						geometry.vertices = curve.getPoints(40);
						var material = new THREE.LineBasicMaterial({color: color});
						return new THREE.Line(geometry, material);
					}
					var curve = new THREE.CurvePath();
					curve.add(new THREE.LineCurve3(v[0], v[1]));
					curve.add(new THREE.LineCurve3(v[1], v[2]));
					curve.add(new THREE.LineCurve3(v[2], v[3]));
					prototype.scene.add(curveToLine(curve, 0xffffff));
					*/

					var curve = new THREE.CatmullRomCurve3(v);
					//prototype.scene.add(curveToLine(curve, 0xff0000));

					var progress = {t: 0};
					TweenMax.to(progress, 3, {
						t: 1,
						ease: Power4.easeInOut,
						onUpdate: function() {
							var p = curve.getPointAt(this.target.t);
							card.position.copy(p);
						}
					});
				}
				shiftInterval = setInterval(shiftCard, 1000);
			},
			'stop shuffle': function() {
				clearInterval(shiftInterval);
			},
			'grab': enterGrabMode
		};
		Object.keys(opts).forEach(function(key) { gui.add(opts, key); });
	}
	
// Init Prototype
	function Prototype_init() {
		var renderer = this.renderer;
		var camera = this.camera;
		var scene = this.scene;
		var controls = this.controls;
		var loadTexture = this.getLoadTexture();
		var dragAndDrop = new DragAndDrop({prototype: this, dropZ: cardBoardZ, dragZ: cardDragZ});
		initCamera(camera, controls);
		createLights(scene);
		var interactiveLayer = new THREE.MouseHandler(renderer.domElement, camera);
		interactiveLayer.add(createBoard(loadTexture));
		initCards(loadTexture, interactiveLayer);
		dragAndDrop.attachToMouseHandler(interactiveLayer);
		dragAndDrop.snapDropPosition = snapDropPosition;
		interactiveLayer.children
			.filter(function(o) { return o instanceof XenoCard; })
			.forEach(function(card) { dragAndDrop.attachCard(card); })
		scene.add(interactiveLayer);
		initGUI(this);
	}
	function init() {
		console.clear();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();