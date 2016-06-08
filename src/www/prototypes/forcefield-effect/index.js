(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var assetdata = require('assetdata');
var XenoCard3D = require('XenoCard3D');
var ForcefieldEffect = require('ForcefieldEffect');
var THREEPrototype = require('THREEPrototype');
var loadDynamicMaterials = require('loadDynamicMaterials');
var initLights = require('initLights');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;

	
// Init Prototype
	function Prototype_init() {
		var scene = this.scene;
		var loadTexture = this.getLoadTexture();
		var loadShader = this.getLoadShader();
		var xenoCard3D = new XenoCard3D();
		var materialLoader = loadDynamicMaterials(this);
		var forcefieldMaterial = materialLoader.createForceFieldMaterial();

		this.setCamera(new THREE.Vector3(0, 0, 500), new THREE.Vector3(0, 0, 0));
		initLights(this);


		var backdrop = new THREE.Mesh(new THREE.PlaneGeometry(320, 180), new THREE.MeshPhongMaterial({color: 0x663366}));
		backdrop.scale.set(5, 5, 0.1);
		backdrop.position.set(0, 0, -10);
		scene.add(backdrop);

		portraitTex = loadTexture(getRandomPortraitUrl());
		var card = xenoCard3D.createCard(portraitTex);

		card.position.set(0, 0, 100);
		scene.add(card);

		var forcefield = new ForcefieldEffect(forcefieldMaterial);
		forcefield.position.copy(card.position);
		scene.add(forcefield);

		scene.add(new THREE.WireframeHelper(forcefield, 0x00ff00));
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();