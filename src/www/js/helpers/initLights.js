(function() {
	/* jshint validthis: true */
	'use strict';
	var THREE = require('THREE');


	function initLights(prototype) {
		var scene = prototype.scene;
		scene.add(new THREE.AmbientLight(0x404040));
		var spotLight = new THREE.SpotLight(0xffffff, 1, 1700, 45 * Math.PI/180, 1, 0.1);
		spotLight.position.set(200, 200, 1200);
		spotLight.target.position.set(100, 0, 0);
		//spotLight.castShadow = true;
		spotLight.shadow.bias = -0.000001;
		spotLight.shadow.camera.near = 1;
		spotLight.shadow.camera.far = 2000;
		spotLight.shadow.camera.fov = 75;
		spotLight.shadow.mapSize.width = 1024;
		spotLight.shadow.mapSize.height = 1024;
		scene.add(spotLight);
	}


	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = initLights;
	}
})();