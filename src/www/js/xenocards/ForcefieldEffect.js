(function () {
	var THREE = require('THREE');
	var assetdata = require('assetdata');
	var GeometryHelpers = require('GeometryHelpers');
	
	var createForceFieldMaterial = require('createForceFieldMaterial');

	var cardOutline = assetdata.cardOutline;
	var normalizeUVs = GeometryHelpers.normalizeUVs;
	var convexHull = GeometryHelpers.convexHull;

	function ForcefieldEffect(loadShader, noiseMap) {
		var geometry = this.createGeometry();
		var material = createForceFieldMaterial(loadShader, noiseMap);
		THREE.Mesh.call(this, geometry, material);
		this.type = 'ForcefieldEffect';
	}
	ForcefieldEffect.prototype = Object.create(THREE.Mesh.prototype);
	ForcefieldEffect.prototype.constructor = THREE.ForcefieldEffect;
	ForcefieldEffect.prototype.createGeometry = function() {
		//var shapePoints = cardOutline.map(function(p) { return new THREE.Vector2(p[0], p[1]); });
		var shapePoints = convexHull(cardOutline, 300)
			.map(function(p) { return new THREE.Vector2(p[0], p[1]); });

		var cardShape = new THREE.Shape(shapePoints);
		var extrudeSettings = {
			amount: 20,
			bevelEnabled: true,
			bevelSegments: 1,
			steps: 1,
			bevelSize: 25,
			bevelThickness: 15
		};
		var geometry = new THREE.ExtrudeGeometry(cardShape, extrudeSettings);
		var uvOffset = new THREE.Vector2(0, 0);
		normalizeUVs(geometry,
			new THREE.Vector2(-84, -115),
			new THREE.Vector2(84, 115),
			uvOffset
		);

		var modifier = new THREE.SubdivisionModifier(1);
		modifier.modify(geometry);

		geometry.applyMatrix(
			new THREE.Matrix4()
			.makeTranslation(0, 0, -13)
			.scale(new THREE.Vector3(0.84, 0.86, 0.85))
		);
		geometry.verticesNeedUpdate = true;
		return geometry;
	};
	
	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = ForcefieldEffect;
	}
})();