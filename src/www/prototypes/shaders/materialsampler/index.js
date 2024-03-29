(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var MaterialRenderer = require('MaterialRenderer');
var DynamicShaderMaterial = require('DynamicShaderMaterial');
var DynamicMaterialManager = require('DynamicMaterialManager');
var THREEPrototype = require('THREEPrototype');
var GeometryHelpers = require('GeometryHelpers');
var loadDynamicMaterials = require('loadDynamicMaterials');
var initLights = require('initLights');

var iconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ODQ4NzhGQUQ2MzA5MTFFNUJFQUFFQkNENUMzMTU2OTMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6ODQ4NzhGQUU2MzA5MTFFNUJFQUFFQkNENUMzMTU2OTMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NDg3OEZBQjYzMDkxMUU1QkVBQUVCQ0Q1QzMxNTY5MyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo4NDg3OEZBQzYzMDkxMUU1QkVBQUVCQ0Q1QzMxNTY5MyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pl0O1Q0AAAn3SURBVHjanFcJcFvl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';


function createRoundedRectShape(x, y, width, height, radius) {
	var ctx = new THREE.Shape();
	ctx.moveTo(x, y + radius);
	ctx.lineTo(x, y + height - radius);
	ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
	ctx.lineTo(x + width - radius, y + height);
	ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
	ctx.lineTo(x + width, y + radius);
	ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
	ctx.lineTo(x + radius, y);
	ctx.quadraticCurveTo(x, y, x, y + radius);
	return ctx;
}

// Geometries
	function createSphereGeometry() {
		return new THREE.SphereGeometry(0.5, 64, 64);
	}
	function createPlaneGeometry() {
		return new THREE.PlaneGeometry(1, 1);
	}
	function createCubeGeometry() {
		var geo = new THREE.CubeGeometry(1, 1, 1);
		geo.rotateX(45 * Math.PI/180);
		geo.rotateY(45 * Math.PI/180);
		return geo;
	}
	function createRoundedRectGeometry() {
 		var roundedRectShape = createRoundedRectShape(-0.5, -0.5, 1, 1, 0.2);
		return GeometryHelpers.extrudePath(roundedRectShape, 100, 1);
	}


function initMaterialSamples(prototype) {
	var scene = prototype.scene;
	var materialLoader = loadDynamicMaterials(prototype);
	var noiseMap = materialLoader.noiseMap.texture;
	var glowFlowMap = materialLoader.glowFlowMap.texture;

	var loadTexture = prototype.getLoadTexture();
	var loadShader = prototype.getLoadShader();

	var redMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
	var iconMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, map: loadTexture(iconUrl)});
	var noiseTextureMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, map: noiseMap});
	var normalMaterial = materialLoader.createNormalMaterial(noiseMap);
	var forceFieldMaterial = materialLoader.createForceFieldMaterial();
	var glowFlowTextureMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, map: glowFlowMap});
	var glowFlowMaterial = materialLoader.createGlowFlowMaterial();

	
	var materials = [
		redMaterial,
		iconMaterial,
		noiseTextureMaterial,
		normalMaterial,
		forceFieldMaterial,
		glowFlowTextureMaterial,
		glowFlowMaterial,
	];
	var geometries = [
		createSphereGeometry(),
		createPlaneGeometry(),
		createCubeGeometry(),
		createRoundedRectGeometry(),
	];
	
	materials.forEach(function(material, idx, arr) {
		var x = (-0.5 * (arr.length-1) + idx) * 2;
		geometries.forEach(function(geometry, idx, arr) {
			var y = -(-0.5 * (arr.length-1) + idx) * 2;
			var mesh = new THREE.Mesh(geometry, material);
			mesh.position.set(x, y, 0.5);
			scene.add(mesh);
		});
	});
}
	
// Init Prototype
	function Prototype_init() {
		this.setCamera(new THREE.Vector3(0, -4.0, 7), new THREE.Vector3(0, -0.5, 0));
		initLights(this);
		var backdrop = new THREE.Mesh(new THREE.PlaneGeometry(16, 8),
			new THREE.MeshBasicMaterial({
				color: 0x000066,
				transparent: true,
				opacity: 0.8,
				depthWrite: false
			})
		);
		backdrop.renderOrder  = -1;
		this.scene.add(backdrop);
		initMaterialSamples(this);
	}

	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();