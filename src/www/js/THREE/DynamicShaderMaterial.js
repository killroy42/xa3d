(function() {
	'use strict';
	var THREE = require('THREE');

	function DynamicShaderMaterial(opts) {
		var self = this;
		if(opts.vertexShader instanceof Promise) {
			opts.vertexShader.then(function(res) {
				self.vertexShader = res;
				self.needsUpdate = true;
			});
			delete opts.vertexShader;
		}
		if(opts.fragmentShader instanceof Promise) {
			opts.fragmentShader.then(function(res) {
				self.fragmentShader = res;
				self.needsUpdate = true;
			});
			delete opts.fragmentShader;
		}
		THREE.ShaderMaterial.call(this, opts);
		this.type = 'DynamicShaderMaterial';
	}
	DynamicShaderMaterial.prototype = Object.create(THREE.ShaderMaterial.prototype);
	DynamicShaderMaterial.prototype.constructor = DynamicShaderMaterial;
	DynamicShaderMaterial.prototype.onanimate = function() {};
	DynamicShaderMaterial.prototype.animate = function(time) {
		this.onanimate(time);
		return this;
	};


	if(typeof module !== "undefined" && ('exports' in module)) {
		module.exports = {};
		module.exports.DynamicShaderMaterial = DynamicShaderMaterial;
	}
})();