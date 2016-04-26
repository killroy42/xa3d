(function () {
	var THREE = require('THREE');
		
	function XenoCard(cardTex) {
		THREE.Object3D.call(this);
		var geometry = XenoCard.getGeometry();
		var material = new THREE.MeshPhongMaterial({color: 0xff00ff, side: THREE.FrontSide});
		var cardMesh = new THREE.Mesh(geometry, material);
		cardMesh.name = 'cardMesh';
		cardMesh.receiveShadow = true;
		cardMesh.castShadow = true;
		cardMesh.draggable = true;
		var self = this;
		var eventForwarder = function(e) { self.dispatchEvent(e); };
		XenoCard.FORWARDED_EVENTS.forEach(function(eventName) {
			cardMesh.addEventListener(eventName, eventForwarder);
		});
		this.add(cardMesh);
		this.mesh = cardMesh;
		this.name = 'card';
		this.loadTexture(cardTex);
	};
	XenoCard.FORWARDED_EVENTS = ['mousemove', 'mousedown', 'mouseup', 'dragstart', 'dragend', 'drag', 'mouseenter', 'mouseleave'];
	XenoCard.CARD_OUTLINE = [[-67.412432512986,52.888615398467074],[-70.70084385508218,57.27316382528242],[-70.42680957657382,74.53732325586958],[-76.45556370373238,79.74397451269361],[-80.56607788136188,87.41693425962976],[-80.84011215987033,94.81585972988101],[-78.64783793182292,97.83023677333755],[-80.01800932435695,100.02251098673763],[-78.92187221030512,104.40705941352763],[-72.89311808314982,110.43581350042948],[-67.6864667914784,111.80598488377996],[-65.49419256343064,110.16177922375184],[-55.35492425862309,109.6137106703827],[-50.14827296698287,108.24353928702979],[-47.133895903387504,104.68109369022764],[-43.84548456128894,107.96950501033514],[-13.427679646892432,107.1474021802888],[-10.41330258330643,108.79160784036627],[11.783473975846212,109.33967639371326],[14.797851039434432,106.3252993502751],[42.74934744725279,107.42143645697331],[50.422307245486664,99.74847671006452],[53.984752866089615,103.31092230684854],[60.01350699326644,103.03688803017131],[69.87874101955535,93.17165406983383],[70.7008438550759,56.72509527192541],[66.31629539893893,52.0665125684275],[71.52294669059002,-43.84548426814847],[71.52294669060619,-45.763724204890345],[78.09976937480191,-58.09526665531146],[74.53732375418103,-73.71522042582762],[76.45556370374301,-73.98925470250923],[77.2776665392665,-77.00363174594418],[77.27766653927013,-85.77272859957888],[74.81135803267935,-94.5418254531868],[69.05663818404086,-102.4888194768313],[66.04226112045053,-105.77723079694154],[60.01350699327522,-108.79160784038267],[54.80685570160223,-105.50319652023384],[52.614581473549144,-108.24353928701579],[49.05213585293318,-107.14740218028763],[-50.42230724547986,-106.87336790362579],[-51.518444359512216,-108.24353928700599],[-56.17702709415707,-107.96950501034561],[-58.36930132220966,-108.24353928699922],[-64.94612400640484,-107.96950501032755],[-73.98925519716254,-102.48881947679791],[-78.37380365331292,-95.9119968366028],[-78.64783793182329,-85.49869432291695],[-76.1815294252239,-80.56607734272058],[-73.16715236163834,-78.0997688526399],[-80.01800932435991,-57.82123237863651],[-72.34504952611785,-46.31179275823427]];
	XenoCard.getGeometry = function() {
		if(XenoCard._geometry === undefined) {
			// TODO: Add UV generator
			var shapePoints = XenoCard.CARD_OUTLINE.map(function(p) { return new THREE.Vector2(p[0], p[1]); });
			var cardShape = new THREE.Shape(shapePoints);
			var extrudeSettings = {
				amount: 0.25,
				bevelEnabled: true,
				bevelSegments: 1,
				steps: 1,
				bevelSize: 0.125,
				bevelThickness: 0.125
			};
			var geometry = new THREE.ExtrudeGeometry(cardShape, extrudeSettings);
			XenoCard.normalizeUVs(geometry, {x: -84, y: -115}, {x: 84, y: 115});
			XenoCard._geometry = geometry;
		}
		return XenoCard._geometry;
	};
	XenoCard.normalizeUVs = function(geometry, min, max) {
		geometry.computeBoundingBox();
		min = min || geometry.boundingBox.min;
		max = max || geometry.boundingBox.max;
		var offset = new THREE.Vector2(0 - min.x, 0 - min.y);
		var range = new THREE.Vector2(max.x - min.x, max.y - min.y);
		geometry.faceVertexUvs[0] = [];
		var faces = geometry.faces;
		for (i = 0; i < geometry.faces.length ; i++) {
			var v1 = geometry.vertices[faces[i].a];
			var v2 = geometry.vertices[faces[i].b];
			var v3 = geometry.vertices[faces[i].c];
			geometry.faceVertexUvs[0].push([
				new THREE.Vector2( ( v1.x + offset.x ) / range.x , ( v1.y + offset.y ) / range.y ),
				new THREE.Vector2( ( v2.x + offset.x ) / range.x , ( v2.y + offset.y ) / range.y ),
				new THREE.Vector2( ( v3.x + offset.x ) / range.x , ( v3.y + offset.y ) / range.y )
			]);
		}
		geometry.uvsNeedUpdate = true;
	};
	XenoCard.prototype = Object.create(THREE.Object3D.prototype);
	XenoCard.prototype.constructor = THREE.XenoCard;
	XenoCard.prototype.loadTexture = function(cardTex) {
		this.mesh.material.color.setHex(0xffffff);
		this.mesh.material.map = cardTex;
		this.mesh.material.needsUpdate = true;
	};
	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = XenoCard;
	}
})();