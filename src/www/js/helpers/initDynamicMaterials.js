(function() {
	/* jshint validthis: true */
	'use strict';
	var THREE = require('THREE');
	var DynamicShaderMaterial = require('DynamicShaderMaterial');
	var MaterialRenderer = require('MaterialRenderer');


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


	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = {};
		module.exports.initDynamicMaterials = initDynamicMaterials;
	}
})();