(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var DynamicShaderMaterial = require('DynamicShaderMaterial');
var MaterialRenderer = require('MaterialRenderer');
var MouseHandler = require('MouseHandler');
var XenoCard = require('XenoCard');
var ForcefieldEffect = require('ForcefieldEffect');
var MouseCursor = require('MouseCursor');
var ControlsSwitcher = require('ControlsSwitcher');
var DragAndDrop = require('DragAndDrop');
var THREEPrototype = require('THREEPrototype');
var initLights = require('initLights');
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
	function initDynamicMaterials(prototype) {
		var dynamicMaterials = [];
		var noiseMap = prototype.noiseMap = MaterialRenderer.createRenderTarget(512, 512);
		var noiseMaterial = new DynamicShaderMaterial({
			uniforms: {
				time: {type: "f", value: 1.0},
				scale: {type: "v2", value: new THREE.Vector2(1, 1)}
			},
			vertexShader: prototype.loadShader('simple.vertex'),
			fragmentShader: prototype.loadShader('noise.fragment'),
			lights: false,
			onanimate: function(time) {
				this.uniforms.time.value = time * 0.001;
			}
		});
		dynamicMaterials.push({target: noiseMap, material: noiseMaterial});
		var materialRenderer = new MaterialRenderer(prototype.renderer);
		prototype.onrender = function(time) {
			for(var i = 0, l = dynamicMaterials.length; i < l; i++) {
				var material = dynamicMaterials[i].material;
				var target = dynamicMaterials[i].target;
				material.animate(time);
				materialRenderer.render(material, target);
			}
		};
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
			console.info('initGUI > aimCard();');
			//leaveGrabMode();
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
			console.info('initGUI > enterGrabMode();');
			var cards = getCards();
			prototype.controls.enabled = false;
			cards.forEach(function(card) {
				card.mesh.draggable = false;
				card.addEventListener('click', aimCard);
			});
			mouseHandler.addEventListener('mouseup', leaveGrabMode);
		}
		function leaveGrabMode() {
			console.info('initGUI > leaveGrabMode();');
			mouseHandler.removeEventListener('mouseup', leaveGrabMode);
			setTimeout(function() {
				var cards = getCards();
				prototype.controls.enabled = true;
				cards.forEach(function(card) {
					card.mesh.draggable = true;
					card.removeEventListener('click', aimCard);
				});
			}, 0);
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
		var scene = this.scene;
		var loadTexture = this.getLoadTexture();
		var loadShader = this.getLoadShader();
		var mouseHandler = new MouseHandler({
			domElement: this.renderer.domElement,
			camera: this.camera,
			scene: this.scene
		});
		var pointer = new MouseCursor({scene: this.scene}).attach(mouseHandler);
		var controlsSwitcher = new ControlsSwitcher(this.controls).attach(mouseHandler);

		this.setCamera(new THREE.Vector3(0, -400, 1000), new THREE.Vector3(0, -90, 0));
		initLights(this);
		initDynamicMaterials(this);

		initGUI(this);

		scene.add(createBoard(loadTexture(boardImageUrl), loadTexture(boardAlphaUrl)));
				
		var cardTex = this.loadTexture(cardImageUrl);
		createCards(scene, cardTex);
		var cards = scene.children.filter(function(o) { return o instanceof XenoCard; });
		var noiseMap = this.noiseMap;
		cards.forEach(function(card) {
			var forcefield = new ForcefieldEffect(loadShader, noiseMap);
			card.add(forcefield);
		});

		var dragAndDrop = new DragAndDrop({prototype: this, dropZ: cardBoardZ, dragZ: cardDragZ});
		dragAndDrop.attachToMouseHandler(mouseHandler);
		dragAndDrop.snapDropPosition = snapDropPosition;
		cards.forEach(function(card) { dragAndDrop.attachCard(card); });

	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();