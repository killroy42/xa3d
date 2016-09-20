(function () {
	var THREE = require('THREE');
	var assetdata = require('assetdata');
	var GeometryHelpers = require('GeometryHelpers');
	
	//var createForceFieldMaterial = require('createForceFieldMaterial');

	var cardOutline = assetdata.cardOutline;
	var normalizeUVs = GeometryHelpers.normalizeUVs;
	var convexHull = GeometryHelpers.convexHull;

	//function ForcefieldEffect(loadShader, noiseMap) {
	function ForcefieldEffect(material) {
		var geometry = this.createGeometry();
		//var material = createForceFieldMaterial(loadShader, noiseMap);
		THREE.Mesh.call(this, geometry, material);
		this.type = 'ForcefieldEffect';
	}
	ForcefieldEffect.prototype = Object.create(THREE.Mesh.prototype);
	ForcefieldEffect.prototype.constructor = THREE.ForcefieldEffect;
	ForcefieldEffect.prototype.createGeometry = function() {
		//var shapePoints = cardOutline;
		var shapePoints = convexHull(cardOutline, 1000);
		shapePoints = shapePoints.map(function(p) { return new THREE.Vector2(p[0], p[1]); });

		var cardShape = new THREE.Shape(shapePoints);
		var extrudeSettings = {
			amount: 20,
			bevelEnabled: true,
			bevelSegments: 2,
			steps: 1,
			bevelSize: 20,
			bevelThickness: 10
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

		//var tessellateModifier = new THREE.TessellateModifier(50);
		//geometry = tessellateModifier.modify(geometry);

		//var simplifyModifier = new THREE.SimplifyModifier();
		//geometry = simplifyModifier.modify(geometry, 100);

		geometry.applyMatrix(
			new THREE.Matrix4()
			.makeTranslation(0, 0, -8)
			.scale(new THREE.Vector3(0.87, 0.90, 0.90))
		);
		geometry.verticesNeedUpdate = true;
		return geometry;
	};
	
	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = ForcefieldEffect;
	}
})();