(function() {

const THREE = require('THREE');
const enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
const THREEPrototype = require('THREEPrototype');
const initLights = require('initLights');
const assetdata = require('assetdata');


// Init Prototype
	function Prototype_init() {
		const app = this;
		const {scene, camera, renderer} = app;
		initLights(app);
	
	}
	function init() {
		var prototype = new THREEPrototype({fov: 70});
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();