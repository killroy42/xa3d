(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var THREEPrototype = require('THREEPrototype');
//var MouseHandler = require('MouseHandler');
//var MouseCursor = require('MouseCursor');
//var ControlsSwitcher = require('ControlsSwitcher');
var initLights = require('initLights');
var createBoard = require('createBoard');
var assetdata = require('assetdata');
var WebSocketConnection = require('WebSocketConnection');
var NetworkClient = require('NetworkClient');
var GameClient = require('GameClient');
var BoxBlueprint = require('BoxBlueprint');
var CardBlueprint = require('CardBlueprint');
var GameBlueprint = require('GameBlueprint');
var PlayerBlueprint = require('PlayerBlueprint');
var XenoCard3D = require('XenoCard3D');
var DynamicShaderMaterial = require('DynamicShaderMaterial');
var loadDynamicMaterials = require('loadDynamicMaterials');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var cardInfo = assetdata.cardInfo;
var cardW = cardInfo.width, cardH = cardInfo.height;
var cardBoardZ = cardInfo.boardZ, cardDragZ = cardInfo.dragZ;
var boardTextureUrl = assetdata.boardTextureUrl;
var boardAlphaUrl = assetdata.boardAlphaUrl;


function Prototype_init() {
	var scene = this.scene;
	var loadShader = this.getLoadShader();
	var loadTexture = this.getLoadTexture();
	var boardTex = loadTexture(boardTextureUrl);
	var boardAlpha = loadTexture(boardAlphaUrl);
	var materials = loadDynamicMaterials(this);
	/*
	var mouseHandler = this.mouseHandler = new MouseHandler({
		domElement: this.renderer.domElement,
		camera: this.camera,
		scene: this.scene
	});
	var pointer = new MouseCursor({scene: this.scene}).attach(mouseHandler);
	var controlsSwitcher = new ControlsSwitcher(this.controls).attach(mouseHandler);
	*/
	var camera = this.camera;
	camera.near = 0.01;
	camera.far = 100;

	this.setCamera(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
	//initLights(this);

	
	var matRef = new DynamicShaderMaterial({
		uniforms: {
			time: {type: 'f', value: 1.0},
			frequency: { type: 'f', value: 0.3 },
			scale: {type: 'v2', value: new THREE.Vector2(1, 1)}
		},
		vertexShader: loadShader('simple.vertex'),
		fragmentShader: loadShader('starnest.fragment'),
	});
	var matStarNest = new DynamicShaderMaterial({
		uniforms: {
			time: {type: 'f', value: 1.0},
			scale: {type: 'v2', value: new THREE.Vector2(1, 1)},

			iterations: { type: 'f', value: 17 },
			volsteps: { type: 'f', value: 20 },
			stepsize: { type: 'f', value: 0.1 },
			formuparam: { type: 'f', value: 0.53 },

			color: { type: 'c', value: new THREE.Color() },
			contrast: { type: 'f', value: 1.0 },
			saturation: { type: 'f', value: 0.850 },
			brightness: { type: 'f', value: 0.0015 },
			distfading: { type: 'f', value: 0.730 },
			darkmatter: { type: 'f', value: 0.300 },
			darkmattercutoff: { type: 'f', value: 0.300 },

			tile: { type: 'f', value: 0.85 },
			fold: { type: 'f', value: 2.0 },
			zoom: { type: 'f', value: 0.8 },
			pos: {type: 'v3', value: new THREE.Vector3(1, 0.5, 0.5)},
			rot: {type: 'v3', value: new THREE.Vector3(0.5, 0, 0.8)},

			//rotx: { type: 'f', value: 0.0 },
			//roty: { type: 'f', value: 0.0 },
			//rotz: { type: 'f', value: 0.0 },
		},
		vertexShader: loadShader('simple.vertex'),
		fragmentShader: loadShader('starnest-b.fragment'),
	});

	var quadRef = this.quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matRef);
	quadRef.scale.set(2, 2, 2);
	quadRef.position.set(2, 0, 0);
	scene.add(quadRef);
	var starnest = this.quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matStarNest);
	starnest.scale.set(2, 2, 2);
	starnest.position.set(0, 0, 0);
	scene.add(starnest);

	var gui = new dat.GUI();
	var guiOpts = {
		iterations: 17,
		volsteps: 20,
		stepsize: 0.1,
		formuparam: 0.53,
		
		color: '#000000',
		contrast: 1.0,
		saturation: 0.850,
		brightness: 0.0015,

		distfading: 0.730,
		darkmatter: 0.300,
		darkmattercutoff: 0.3,

		tile: 0.85,
		fold: 2.0,
		zoom: 0.08,
		rotx: 0.5,
		roty: 0.0,
		rotz: 0.8,
		posx: 1.0,
		posy: 0.5,
		posz: 0.5,
	};
	gui.remember(guiOpts);
	gui.add(guiOpts, 'iterations', 1, 64);
	gui.add(guiOpts, 'volsteps', 1, 64);
	gui.add(guiOpts, 'stepsize', 0.0001, 1);
	gui.add(guiOpts, 'formuparam', 0.01, 1.0);

	gui.addColor(guiOpts, 'color');
	gui.add(guiOpts, 'contrast', 0.0, 3.0);
	gui.add(guiOpts, 'saturation', 0.001, 1.0);
	gui.add(guiOpts, 'brightness', 0.0001, 0.1);

	gui.add(guiOpts, 'distfading', 0.01, 1.0);
	gui.add(guiOpts, 'darkmatter', 0.0, 1.0);
	gui.add(guiOpts, 'darkmattercutoff', 0.0, 1.0);
	gui.add(guiOpts, 'tile', 0.01, 2.0);
	gui.add(guiOpts, 'fold', 0.0, 4.0);
	gui.add(guiOpts, 'zoom', 0.001, 1.0);

	var rot = gui.addFolder('rotation');
	rot.add(guiOpts, 'rotx', -1, 1);
	rot.add(guiOpts, 'roty', -1, 1);
	rot.add(guiOpts, 'rotz', -1, 1);
	var pos = gui.addFolder('position');
	pos.add(guiOpts, 'posx', 0, 2);
	pos.add(guiOpts, 'posy', 0, 1);
	pos.add(guiOpts, 'posz', 0, 1);
	//Object.keys(guiOpts).forEach(function(key) { gui.add(guiOpts, key); });
	//gui.close();

	this.onupdate = function(time) {
		//matA.uniforms.time.value = time * 0.001;
		matStarNest.uniforms.time.value = time * 0.001;
		Object.keys(guiOpts).forEach(function(key) {
			if(matStarNest.uniforms[key]) matStarNest.uniforms[key].value = guiOpts[key];
		});

		if(camera.position.clone().sub(matStarNest.uniforms.pos.value).length() > 0.0000001) {
			//console.log(camera.position.clone().sub(matStarNest.uniforms.pos.value).length());
			//console.log(camera.position, matStarNest.uniforms.pos.value);
			//console.log(starnest.position.clone().sub(camera.position));
			//var a = new THREE.Euler().setFromQuaternion(camera.quaternion, 'XYZ');
			//console.log(a.x * 180 / Math.PI, a.y * 180 / Math.PI, a.z * 180 / Math.PI);
			//camera.position.clone().sub(matStarNest.uniforms.pos.value).length()
			//matStarNest.uniforms.pos.value.copy(camera.position);

		}

		// Color
			var c = guiOpts.color;
			//console.log(matStarNest.uniforms.color.value)
			//console.log(parseInt(c.replace('#', ''), 16));
			//console.log(new THREE.Color(c[0], c[1], c[2]));
			matStarNest.uniforms.color.value = new THREE.Color(parseInt(c.replace('#', ''), 16));
			//console.log(matStarNest.uniforms.color.value);

		// Position
			//matB.uniforms.pos.value.set(guiOpts.posx, guiOpts.posy, guiOpts.posz);
			/*
			matStarNest.uniforms.pos.value
				.copy(starnest.position.clone().sub(camera.position))
				.multiplyScalar(0.1);
			*/
			var zoom = matStarNest.uniforms.zoom.value;
			matStarNest.uniforms.pos.value.x = guiOpts.posx;
			matStarNest.uniforms.pos.value.y = guiOpts.posy;
			matStarNest.uniforms.pos.value.z = guiOpts.posz;
			matStarNest.uniforms.pos.value
				.add(
					new THREE.Vector3(time * zoom * 2.0, time * zoom * 2.0 * -0.125, 0)
					.multiplyScalar(0.000001)
				);
		// Rotation
			matStarNest.uniforms.rot.value.set(guiOpts.rotx, guiOpts.roty, guiOpts.rotz);
			/*
			var a = camera.rotation;
			matStarNest.uniforms.rot.value.set(
				-a.y * 180 / Math.PI,
				a.x * 180 / Math.PI,
				a.z * 180 / Math.PI
			);
			*/

	};
	this.onrender = function(time) {
	};
}

document.addEventListener('DOMContentLoaded', function init() {
	var prototype = new THREEPrototype({fov: 90});
	prototype.oninit = Prototype_init;
	prototype.start();
	window.app = prototype;
});

})();