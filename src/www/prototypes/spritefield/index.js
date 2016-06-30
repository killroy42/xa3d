// GLParticleSystem
(function () {	
	var THREE = require('THREE');

	function GLParticleSystem(count, attributes) {
		THREE.Points.call(this);
		var self = this;
		this.count = count;
		this.geometry = new THREE.BufferGeometry();
		Object.keys(attributes).forEach(function(name) {
			self.addAttribute(name, attributes[name]);
		});
	}
	GLParticleSystem.prototype = Object.create(THREE.Points.prototype);
	GLParticleSystem.prototype.constructor = GLParticleSystem;
	GLParticleSystem.prototype.addAttribute = function(name, width) {
		width = width || 1;
		var values = new Float32Array(this.count * width);
		for(var i = 0, l = values.length; i < l; i++) values[i] = 0;
		this.geometry.addAttribute(name, new THREE.BufferAttribute(values, width));
	};


	// export in common js
	if(typeof module !== 'undefined' && ('exports' in module)) {
		module.exports = GLParticleSystem;
	}
})();


(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var THREEPrototype = require('THREEPrototype');
var MouseHandler = require('MouseHandler');
var MouseCursor = require('MouseCursor');
var ControlsSwitcher = require('ControlsSwitcher');
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
var GLParticleSystem = require('GLParticleSystem');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var cardInfo = assetdata.cardInfo;
var cardW = cardInfo.width, cardH = cardInfo.height;
var cardBoardZ = cardInfo.boardZ, cardDragZ = cardInfo.dragZ;
var boardTextureUrl = assetdata.boardTextureUrl;
var boardAlphaUrl = assetdata.boardAlphaUrl;

var spritesUrl = '/images/xenocide-sprites.png';
var animFps = 5;
var maxSpeed = 0.1;
var maxAge = 20000;
var particleCount = 1000000;
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
var animations = [
	[0, 1, 2, 3],
	[4, 5, 6, 7, 8, 9, 10],
	[32, 33, 34, 35],
	[41, 42, 43, 45, 46, 47, 48],
	[32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48],
	[128, 129, 130, 131],
	[160, 161, 162, 163],
	[70, 74, 78, 74],
	[74, 74, 74, 82, 86, 90, 82, 86, 90, 82, 86, 90, 82, 86, 90],
	[176, 177, 178, 179, 180, 181],
	[207, 208, 209, 210, 211, 212, 213, 214, 215],
	[216, 217, 218, 219],
	[220, 221, 222, 223],
	[224, 225, 226, 227, 228, 229, 230, 231],
	[304, 305, 306, 307],
];


function initGeometry(geometry) {
	//console.info('initGeometry(geometry);');
	var attributes = geometry.attributes;
	var age = attributes.age.array;
	var velocity = attributes.velocity.array;
	var anim = attributes.anim.array;
	var animation = attributes.animation.array;
	var frame = attributes.frame.array;
	var count = age.length;
	var color = new THREE.Color();
	var v = new THREE.Vector3();
	for (var i = 0, i3 = 0, l = count; i < l; i++, i3 += 3) {
		age[i] = Math.floor(Math.random()*maxAge);
		color.setHSL(Math.random(), 1.0, 0.5);
		v.set((Math.random()*2-1)*maxSpeed, (Math.random()*2-1)*maxSpeed / 10, (Math.random()*2-1)*maxSpeed);
		v.normalize().multiplyScalar(maxSpeed);
		velocity[i3+0] = v.x;
		velocity[i3+1] = v.y;
		velocity[i3+2] = v.z;
		var animIdx = Math.floor(Math.random()*animations.length);
		animation[i] = animIdx;
		frame = 0;
		anim[i3+0] = animations[animIdx][0];
		anim[i3+1] = animations[animIdx][1];
		anim[i3+2] = animations[animIdx][2];
	}
	attributes.age.needsUpdate = true;
	attributes.velocity.needsUpdate = true;
	attributes.anim.needsUpdate = true;
	attributes.frame.needsUpdate = true;
}
function updateGeometry(geometry) {
	//console.info('updateGeometry(geometry);');
	var age = geometry.attributes.age.array;
	var animation = geometry.attributes.animation.array;
	var frame = geometry.attributes.frame.array;
	var i = age.length; while(i--) {
		var animFrames = animations[animation[i]];
		frame[i] = animFrames[Math.floor(age[i] * animFps / 60) % animFrames.length];
		if(age[i]++ >= maxAge) age[i] = 0;
	}
	geometry.attributes.age.needsUpdate = true;
	geometry.attributes.frame.needsUpdate = true;
}

/*
particleSystem.material = new THREE.ShaderMaterial({
	uniforms: {
		color: {type: "c", value: new THREE.Color(0xffffff)},
		texture: {type: "t", value: texture}
	},
	defines: {
		MAXAGE: maxAge.toFixed(6),
	},
	vertexShader: vertexShader,
	fragmentShader: fragmentShader,
	//blending: THREE.CustomBlending,
	//blendSrc: THREE.SrcAlphaFactor,
	//blendDst: THREE.OneMinusSrcAlphaFactor,
	//depthTest: false,
	transparent: true
});
*/

function createSpriteFieldMaterial(loadShader, spriteMap) {
	return new DynamicShaderMaterial({
		uniforms: {
			color: {type: 'c', value: new THREE.Color(0xff00ff)},
			texture: {type: 't', value: spriteMap}
		},
		defines: {
			MAXAGE: maxAge.toFixed(6),
		},
		vertexShader: loadShader('spritefield.vertex'),
		fragmentShader: loadShader('spritefield.fragment'),
		transparent: true,
		//blending: THREE.CustomBlending,
		//blendSrc: THREE.SrcAlphaFactor,
		//blendDst: THREE.OneMinusSrcAlphaFactor,
		//depthTest: false,
		//depthWrite: false,
	});
}

function initParticleSystem(scene, spriteFieldMaterial) {
	var particleSystem = new GLParticleSystem(particleCount, {
		age: 1,
		position: 3, // Unused
		velocity: 3,
		anim: 3,
		animation: 1,
		frame: 1
	});
	//var vertexShader = document.getElementById('vertexshader').textContent;
	//var fragmentShader = document.getElementById('fragmentshader').textContent;
	/*
	var texture = new THREE.TextureLoader().load(xenocideSprites);
	texture.minFilter = THREE.NearestFilter;
	texture.magFilter = THREE.NearestFilter;
	texture.generateMipmaps = false;
	texture.flipY = false;
	particleSystem.material = new THREE.ShaderMaterial({
		uniforms: {
			color: {type: "c", value: new THREE.Color(0xffffff)},
			texture: {type: "t", value: texture}
		},
		defines: {
			MAXAGE: maxAge.toFixed(6),
		},
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		//blending: THREE.CustomBlending,
		//blendSrc: THREE.SrcAlphaFactor,
		//blendDst: THREE.OneMinusSrcAlphaFactor,
		//depthTest: false,
		transparent: true
	});
	*/
	particleSystem.material = spriteFieldMaterial;
	initGeometry(particleSystem.geometry);
	return particleSystem;
}


function Prototype_init() {
	var scene = this.scene;
	var loadShader = this.getLoadShader();
	var loadTexture = this.getLoadTexture();
	var boardTex = loadTexture(boardTextureUrl);
	var boardAlpha = loadTexture(boardAlphaUrl);
	var spritesTex = loadTexture(spritesUrl);
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
	camera.near = 1;
	camera.far = 100000;

	this.setCamera(new THREE.Vector3(0, -400, 1000), new THREE.Vector3(0, -90, 0));
	//initLights(this);
	var board = createBoard(boardTex, boardAlpha);
	scene.add(board);

	spritesTex.minFilter = THREE.NearestFilter;
	spritesTex.magFilter = THREE.NearestFilter;
	spritesTex.generateMipmaps = false;
	spritesTex.flipY = false;
	var spriteFieldMaterial = createSpriteFieldMaterial(loadShader, spritesTex);
	//var spriteFieldMaterial = new THREE.PointsMaterial();
	var particleSystem = initParticleSystem(scene, spriteFieldMaterial);
	scene.add(particleSystem);

	updateGeometry(particleSystem.geometry);

	this.onupdate = function(time) {
		updateGeometry(particleSystem.geometry);
		//particleSystem.rotation.x += 0.0003;
		//particleSystem.rotation.x = 20 * Math.PI / 180;
		//var t = time * 0.0002;
		//particleSystem.rotation.y = t / 10;
		//camera.position.z = 600 + (1 + Math.cos(t)) * 800;
	};
	this.onrender = function(time) {
	};
}

document.addEventListener('DOMContentLoaded', function init() {
	var prototype = new THREEPrototype({fov: 90});
	prototype.oninit = Prototype_init;
	prototype.start();
});

})();