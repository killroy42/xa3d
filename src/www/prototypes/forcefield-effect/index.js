(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var DynamicShaderMaterial = require('DynamicShaderMaterial');
var MaterialRenderer = require('MaterialRenderer');
var XenoCard = require('XenoCard');
var ForcefieldEffect = require('ForcefieldEffect');
var THREEPrototype = require('THREEPrototype');
var initLights = require('initLights');

var bgImageUrl = '/images/xa_logo_bg_720p.jpg';
var cardImageUrl = '/images/buttonia.jpg';


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
	function createCube(loadTexture) {
		var tex = loadTexture(bgImageUrl);
		var geo = new THREE.CubeGeometry(200, 200, 200, 2, 2, 2);
		var material = new THREE.MeshPhongMaterial({color: 0xffffff, map: tex});
		var mesh = new THREE.Mesh(geo, material);
		var faces = geo.faces;
		var scale = new THREE.Vector2(3, 3);
		var offset = new THREE.Vector2(0, 0.15);
		var normalizeXY = new THREE.Vector2(0.5, 0.5);
		scale.y *= 9/16;
		for (i = 0; i < geo.faces.length; i++) {
			for (ii = 0; ii < 3; ii++) {
				var v = geo.faceVertexUvs[0][i][ii];
					v
					.add(offset)
					.sub(normalizeXY)
					.divide(scale)
					.add(normalizeXY)
					;
			}
		}
		geo.uvsNeedUpdate = true;
		mesh.receiveShadow = true;
		mesh.castShadow = true;
		return mesh;
	}
	
	
// Init Prototype
	function Prototype_init() {
		var scene = this.scene;
		var loadTexture = this.getLoadTexture();
		var loadShader = this.getLoadShader();
		this.setCamera(new THREE.Vector3(0, 0, 500), new THREE.Vector3(0, 0, 0));
		initLights(this);
		initDynamicMaterials(this);

		sky = createCube(loadTexture);
		sky.scale.set(20, 20, 20);
		sky.material.side = THREE.BackSide;
		scene.add(sky);

		var backdrop = new THREE.Mesh(new THREE.PlaneGeometry(320, 180), new THREE.MeshPhongMaterial({color: 0x663366}));
		backdrop.scale.set(5, 5, 0.1);
		backdrop.position.set(0, 0, -10);
		scene.add(backdrop);

		var cardTex = this.loadTexture(cardImageUrl);
		var card = new XenoCard(0, cardTex);
		card.position.set(0, 0, 100);
		scene.add(card);

		var noiseMap = this.noiseMap;
		var forcefield = new ForcefieldEffect(loadShader, noiseMap);
		forcefield.position.copy(card.position);
		scene.add(forcefield);
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();