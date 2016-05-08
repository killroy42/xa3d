(function() {
var modules = [
	'/vendors/three_r77dev.js',
	'/js/THREE/Prototype.js',
	'/vendors/OrbitControls.js',
	'/js/helpers/initLights.js'
];

var THREEPrototype, initLights;

function registerModules() {
	require('enhanceTHREE')(require('THREE'));
	THREEPrototype = require('/js/THREE/Prototype.js').THREEPrototype;
	initLights = require('/js/helpers/initLights.js');
}

function Prototype_init() {
	var self = this;
	this.setCamera(new THREE.Vector3(0, -1, 6), new THREE.Vector3(0, 0, 0));
	initLights(this);
	var backdrop = new THREE.Mesh(new THREE.PlaneGeometry(8, 8),
		new THREE.MeshPhongMaterial({color: 0x0000ff})
	);
	backdrop.renderOrder  = -1;
	this.scene.add(backdrop);
}
function init() {
	module.loadFromUrl(modules)
	.then(function() {
		registerModules();
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	});
}

document.addEventListener('DOMContentLoaded', init);
	
})();