(function() {
	'use strict';
	var DynamicShaderMaterial = require('DynamicShaderMaterial');
	var MaterialRenderer = require('MaterialRenderer');
	var DynamicMaterialManager = require('DynamicMaterialManager');


	function createNoiseTexture(loadShader) {
		return new DynamicShaderMaterial({
			uniforms: {
				time: {type: 'f', value: 1.0},
				frequency: { type: 'f', value: 0.3 },
				scale: {type: 'v2', value: new THREE.Vector2(1, 1)}
			},
			vertexShader: loadShader('simple.vertex'),
			fragmentShader: loadShader('noise.fragment'),
			lights: false,
			onanimate: DynamicShaderMaterial.ANIMATE_TIME_FUNCTION
		});
	}
	function createNormalMaterial(loadShader, heightMap) {
		return new DynamicShaderMaterial({
			uniforms: {
				heightMap: {type: 't', value: heightMap},
				resolution: {type: 'v2', value: new THREE.Vector2(128, 128)},
				scale: {type: 'v2', value: new THREE.Vector2(1, 1)},
				height: {type: 'f', value: 0.02}
			},
			vertexShader: loadShader('normal.vertex'),
			fragmentShader: loadShader('normal.fragment'),
			lights: false,
		});
	}
	function createForceFieldMaterial(loadShader, noiseMap) {
		return new DynamicShaderMaterial({
			uniforms: {
				'c': { type: 'f', value: 1.0 },
				'p': { type: 'f', value: 1.4 },
				glowColor: { type: 'c', value: new THREE.Color(0xffff00) },
				noiseMap: {type: 't', value: noiseMap}
			},
			vertexShader: loadShader('forcefield.vertex'),
			fragmentShader: loadShader('forcefield.fragment'),
			lights: false,
			side: THREE.FrontSide,
			blending: THREE.AdditiveBlending,
			depthTest: true,
			depthWrite: false,
			transparent: true,
		});
	}
	function createGlowFlowTexture(loadShader) {
		return new DynamicShaderMaterial({
			uniforms: {
				time: { type: 'f', value: 0.0 },
				frequency: { type: 'f', value: 1.0 },
				glowColor: { type: 'c', value: new THREE.Color(0xffffff) },
			},
			vertexShader: loadShader('glowflow.vertex'),
			fragmentShader: loadShader('glowflow.fragment'),
			lights: false,
			//side: THREE.DoubleSide,
			//blending: THREE.AdditiveBlending,
			//depthTest: true,
			//depthWrite: false,
			//transparent: true,
			onanimate: DynamicShaderMaterial.ANIMATE_TIME_FUNCTION
		});
	}
	function createGlowFlowMaterial(loadShader, glowFlowMap, color) {
		return new DynamicShaderMaterial({
			uniforms: {
				scale: {type: 'v2', value: new THREE.Vector2(1, 1)},
				glowColor: { type: 'c', value: color },
				alpha: { type: 'f', value: 1 },
				//textureMap: {type: 't', value: glowFlowMap},
				alphaMap: {type: 't', value: glowFlowMap}
			},
			vertexShader: loadShader('simple.vertex'),
			fragmentShader: loadShader('simple.fragment'),
			//color: color,
			side: THREE.DoubleSide,
			//blending: THREE.AdditiveBlending,
			depthTest: true,
			depthWrite: false,
			transparent: true,
			//map: glowFlowMap,
			//alphaMap: glowFlowMap
		});
	}

	function loadDynamicMaterials(app) {
		var renderer = app.renderer;
		var loadShader = app.getLoadShader();
		var materials = {};
		var dMM = new DynamicMaterialManager(renderer);
		var noiseMap = MaterialRenderer.createRenderTarget(512, 512);
		var noiseTexture = createNoiseTexture(loadShader);
		dMM.add('perlinNoise', noiseTexture, noiseMap);
		var glowFlowMap = MaterialRenderer.createRenderTarget(512, 512);
		var glowFlowTexture = createGlowFlowTexture(loadShader);
		dMM.add('glowFlowTexture', glowFlowTexture, glowFlowMap);
		app.onupdate = dMM.update;
		app.onrender = dMM.render;
		return {
			noiseMap: noiseMap,
			noiseTexture: noiseTexture,
			glowFlowMap: glowFlowMap,
			createNormalMaterial: function(heightMap) { return createNormalMaterial(loadShader, heightMap); },
			createForceFieldMaterial: function() { return createForceFieldMaterial(loadShader, noiseMap.texture); },
			createGlowFlowMaterial: function() { return createGlowFlowMaterial(loadShader, glowFlowMap.texture, new THREE.Color(0xffff00)); },
		};
	}


	// export in common js
	if(typeof module !== 'undefined' && ('exports' in module)){
		module.exports = {};
		module.exports.createNoiseTexture = createNoiseTexture;
		module.exports.createNormalMaterial = createNormalMaterial;
		module.exports.createForceFieldMaterial = createForceFieldMaterial;
		module.exports.createGlowFlowTexture = createGlowFlowTexture;
		module.exports.createGlowFlowMaterial = createGlowFlowMaterial;
		module.exports.loadDynamicMaterials = loadDynamicMaterials;
	}
})();