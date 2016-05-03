(function() {
	'use strict';
	var THREE = require('THREE');

	function MaterialRenderer(renderer) {
		var width = this.width = 512;
		var height = this.height = 512;
		var camera = this.camera = new THREE.OrthographicCamera(width / - 2, width / 2, height / 2, height / - 2, 1, 1000);
		camera.position.z = 20;
		var scene = this.scene = new THREE.Scene();
		var quad = this.quad = new THREE.Mesh(
			new THREE.PlaneGeometry(width, height),
			new THREE.MeshBasicMaterial({color: 0xff0000})
		);
		scene.add(quad);
		this.renderer = renderer;
	}
	MaterialRenderer.createRenderTarget = function MaterialRenderer_createRenderTarget(width, height) {
		return new THREE.WebGLRenderTarget(width, height, {
			minFilter: THREE.LinearMipmapLinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBFormat
		});
	};
	MaterialRenderer.prototype = {};
	MaterialRenderer.prototype.constructor = MaterialRenderer;
	MaterialRenderer.prototype.render = function MaterialRenderer_render(material, output) {
		this.quad.material = material;
		this.renderer.render(this.scene, this.camera, output, true);
		return output;
	};


	if(typeof module !== "undefined" && ('exports' in module)) {
		module.exports = {};
		module.exports.MaterialRenderer = MaterialRenderer;
	}
})();