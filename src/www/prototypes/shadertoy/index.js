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


	var gui = new dat.GUI();
	var guiOpts = {};
	gui.remember(guiOpts);
	//Object.keys(guiOpts).forEach(function(key) { gui.add(guiOpts, key); });
	//gui.close();

	var uniforms = {
		'f': {
			SEA_CHOPPY: [4.0, 0.01, 16.0],
			SEA_FREQ: [4.0, 0.001, 10.0], //0.16
			SEA_HEIGHT: [0.6, 0.01, 2.0],
			SEA_SPEED: [0.0, 0.0, 5.0], //0.8
			offsetx: [0.0, -10.0, 10.0],
			offsety: [0.0, -10.0, 10.0],
			offsetz: [0.0, -10.0, 10.0],
		},
		'i': {
			ITER_GEOMETRY: [3, 0, 10], //3
			ITER_FRAGMENT: [5, 0, 10], //5
			NUM_STEPS: [3, 0, 30], //8
		},
		'v3': {
			ori: [[0, 3.5, 0], [0, 0, 0], [100, 100, 100]],
			ang: [[0, 90, 0], [-180, -180, -180], [180, 180, 180]],
		},
	};

	var shaderUniforms = {
		iGlobalTime: {type: 'f', value: 1.0},
		iResolution: {type: 'v3', value: new THREE.Vector3(64, 64, 1)},
		//iChannel0: {type: 't', value: loadTexture('/images/shadertoy/tex19.jpg')},
		//iChannel1: {type: 't', value: loadTexture('/images/shadertoy/cube03.png')},
		iMouse: {type: 'v2', value: new THREE.Vector2(0, 0)},
		scale: {type: 'v2', value: new THREE.Vector2(1, 1)},
	};
	for(var key0, i0 = 0, keys0 = Object.keys(uniforms), l0 = keys0.length; key0 = keys0[i0], i0 < l0; i0++) {
		for(var key1, i1 = 0, keys1 = Object.keys(uniforms[key0]), l1 = keys1.length; key1 = keys1[i1], i1 < l1; i1++) {
			var val = uniforms[key0][key1];
			console.log(key0, key1, val);
			switch(key0) {
				case 'f':
					shaderUniforms[key1] = {type: key0, value: val[0]};
					guiOpts[key1] = val[0];
					gui.add(guiOpts, key1, val[1], val[2]);
					break;
				case 'i':
					shaderUniforms[key1] = {type: key0, value: val[0]};
					guiOpts[key1] = val[0];
					gui.add(guiOpts, key1, val[1], val[2]).step(1);
					break;
				case 'v3':
					shaderUniforms[key1] = {type: key0, value: new THREE.Vector3(val[0][0], val[0][1], val[0][2])};
					guiOpts[key1+'_x'] = val[0][0]; gui.add(guiOpts, key1+'_x', val[1][0], val[2][0]);
					guiOpts[key1+'_y'] = val[0][1]; gui.add(guiOpts, key1+'_y', val[1][1], val[2][1]);
					guiOpts[key1+'_z'] = val[0][2]; gui.add(guiOpts, key1+'_z', val[1][2], val[2][2]);
					break;
			}
		}
	}
	var matShadertoy = new DynamicShaderMaterial({
		uniforms: shaderUniforms,
		vertexShader: loadShader('simple.vertex'),
		//fragmentShader: loadShader('shadertoy/watersedge.fragment'),
		fragmentShader: loadShader('shadertoy/seascape.fragment'),
	});
	var matShadertoyB = new DynamicShaderMaterial({
		uniforms: shaderUniforms,
		vertexShader: loadShader('simple.vertex'),
		//fragmentShader: loadShader('shadertoy/watersedge.fragment'),
		fragmentShader: loadShader('shadertoy/seascape-b.fragment'),
	});

	var quad =  new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matShadertoy);
	quad.scale.set(2, 2, 2);
	quad.position.set(1, 0, 0);
	scene.add(quad);
	var quadb = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matShadertoyB);
	quadb.scale.set(2, 2, 2);
	quadb.position.set(-1, 0, 0);
	scene.add(quadb);

	this.onupdate = function(time) {
		matShadertoy.uniforms.iGlobalTime.value = time * 0.001;
		Object.keys(guiOpts).forEach(function(key) {
			if(matShadertoy.uniforms[key]) {
				matShadertoy.uniforms[key].value = guiOpts[key];
			}
			else if(key.match(/\_[xyz]$/)) {
				var keyParts = key.split('_');
				if(matShadertoy.uniforms[keyParts[0]].type === 'v3') {
					//console.log(key, guiOpts[key], keyParts[0], keyParts[1], matShadertoy.uniforms[keyParts[0]].type);
					matShadertoy.uniforms[keyParts[0]].value[keyParts[1]] = guiOpts[key];
				}
			}
			
			var offset = camera.position.clone().sub(quad.position);
			matShadertoy.uniforms.offsetx.value = offset.x;
			matShadertoy.uniforms.offsety.value = offset.y;
			matShadertoy.uniforms.offsetz.value = offset.z;
			/*
			console.log(
				matShadertoy.uniforms.offsetx.value,
				matShadertoy.uniforms.offsety.value,
				matShadertoy.uniforms.offsetz.value
			);
			*/
		});
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