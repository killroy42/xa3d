(function () {
	var THREE = require('THREE');
	var DynamicShaderMaterial = require('DynamicShaderMaterial');
	var XenoCard = require('XenoCard');


	function ForcefieldEffect(loadShader, noiseMap) {
		var geometry = this.createGeometry();
		var material = this.createMaterial(loadShader, noiseMap);
		THREE.Mesh.call(this, geometry, material);
		this.type = 'ForcefieldEffect';
	}
	ForcefieldEffect.prototype = Object.create(THREE.Mesh.prototype);
	ForcefieldEffect.prototype.constructor = THREE.ForcefieldEffect;
	ForcefieldEffect.prototype.createGeometry = function() {
		var shapePoints = XenoCard.CARD_OUTLINE.map(function(p) { return new THREE.Vector2(p[0], p[1]); });
		var cardShape = new THREE.Shape(shapePoints);
		var extrudeSettings = {
			amount: 10,
			bevelEnabled: true,
			bevelSegments: 1,
			steps: 1,
			bevelSize: 10,
			bevelThickness: 10
		};
		var geometry = new THREE.ExtrudeGeometry(cardShape, extrudeSettings);
		var uvOffset = new THREE.Vector2(0, 0);
		XenoCard.normalizeUVs(geometry,
			new THREE.Vector2(-84, -115),
			new THREE.Vector2(84, 115),
			uvOffset
		);
		var modifier = new THREE.SubdivisionModifier(2);
		modifier.modify(geometry);
		geometry.applyMatrix(
			new THREE.Matrix4()
			//.makeTranslation(0, 0, -12.5)
			.scale(new THREE.Vector3(0.96, 0.96, 0.96))
		);
		geometry.verticesNeedUpdate = true;
		return geometry;
	};
	ForcefieldEffect.prototype.createMaterial = function(loadShader, noiseMap) {
		var material = new DynamicShaderMaterial({
			uniforms: {
				"c": { type: "f", value: 1.0 },
				"p": { type: "f", value: 1.4 },
				glowColor: { type: "c", value: new THREE.Color(0xffff00) },
				noiseMap: {type: "t", value: noiseMap}
			},
			vertexShader: loadShader('forcefield.vertex'),
			fragmentShader: loadShader('forcefield.fragment'),
			lights: false,
			side: THREE.FrontSide,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			depthTest: true,
			transparent: true
		});
		return material;
	};
	
	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = ForcefieldEffect;
	}
})();