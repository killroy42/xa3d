(function () {
	var THREE = require('THREE');
	
	function XenoCard(type, texture) {
		THREE.Object3D.call(this);
		var geometry = XenoCard.createGeometry(new THREE.Vector2(0, (4-type)*230));
		texture.minFilter = THREE.LinearFilter;
		texture.repeat.y = 1/5;
		var material = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			//map: texture,
			side: THREE.FrontSide
		});
		texture.promise.then(function() {
			material.map = texture;
			material.needsUpdate = true;
		});
		var cardMesh = new THREE.Mesh(geometry, material);
		cardMesh.name = 'cardMesh';
		cardMesh.receiveShadow = true;
		cardMesh.castShadow = true;
		cardMesh.receiveMouseEvents = true;
		cardMesh.draggable = true;
		var self = this;
		var eventForwarder = function(e) { self.dispatchEvent(e); };
		XenoCard.FORWARDED_EVENTS.forEach(function(eventName) {
			cardMesh.addEventListener(eventName, eventForwarder);
		});
		this.add(cardMesh);
		this.mesh = cardMesh;
		this.type = type;
		this.name = 'card';
	}
	XenoCard.FORWARDED_EVENTS = ['mousemove', 'mousedown', 'mouseup', 'click', 'dragstart', 'dragfinish', 'drag', 'mouseenter', 'mouseleave'];
	XenoCard.CARD_OUTLINE = [[-67.41,52.89],[-70.7,57.27],[-70.43,74.54],[-76.46,79.74],[-80.57,87.42],[-80.84,93],[-78.65,97],[-80.02,100.02],[-78.92,104.41],[-72.89,110.44],[-67.69,111.81],[-65.49,110.16],[-55.35,109.61],[-50.15,108.24],[-43.13,104.68],[-35.85,107.97],[-13.43,107.15],[-10.41,108.79],[11.78,109.34],[14.8,106.33],[38.75,107.42],[48.42,99.75],[55.98,103.31],[60.01,103.04],[69.88,93.17],[70.7,56.73],[66.32,52.07],[71.52,-45.76],[78.1,-58.1],[74,-73.85],[77.28,-77],[77.28,-85.77],[74.81,-94.54],[69.06,-102.49],[66.04,-105.78],[60.01,-108.79],[54.81,-106.5],[50,-107.5],[-50,-107.5],[-52,-108],[-58.37,-108.5],[-64.95,-107.97],[-74.2,-102.49],[-78.37,-95.91],[-78,-88],[-74,-83],[-80.02,-57.82],[-72.35,-46.31]];
	XenoCard.createGeometry = function(uvOffset) {
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
		XenoCard.normalizeUVs(geometry,
			new THREE.Vector2(-84, -115),
			new THREE.Vector2(84, 115),
			uvOffset
		);
		return geometry;
	};
	XenoCard.normalizeUVs = function(geometry, min, max, offset) {
		geometry.computeBoundingBox();
		min = min || geometry.boundingBox.min;
		max = max || geometry.boundingBox.max;
		//var offset = new THREE.Vector2(0 - min.x + (offset.x || 0), 0 - min.y + (offset.y || 0));
		offset.x -= min.x;
		offset.y -= min.y;
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
	XenoCard.animatePosition = function(position, vector, duration, easing) {
		duration = duration || 0.1;
		easing = easing || Power4.easeOut;
		//console.info('XenoCard.animatePosition(%s, %s, %s, easing);', position.toString(), vector.toString(), duration);
		return TweenMax.to({t: 0}, duration, {
			t: 1, ease: easing,
			onUpdate: function() {
				var progress = this.target.t;
				position.copy(vector);
				position.multiplyScalar(-(1-progress));
			}
		});
	};
	XenoCard.prototype = Object.create(THREE.Object3D.prototype);
	XenoCard.prototype.constructor = THREE.XenoCard;
	XenoCard.prototype.animateMesh = function(moveVector, snap) {
		var mesh = this.mesh;
		if(snap === undefined) snap = true;

		//console.log(' mv:', moveVector.toString());
		//console.log('pos:', this.position.toString());
		//console.log('msh:', mesh.position.toString());

		if(this.meshTween) {
			this.meshTween.kill();
		}
		mesh.position.sub(moveVector);

		var meshVector = mesh.position.clone().negate();
		
		//this.meshTween = XenoCard.animatePosition(mesh.position, meshVector, 5, Power0.easeNone);
		if(snap) {
			this.meshTween = XenoCard.animatePosition(mesh.position, moveVector, 0.1, Power4.easeOut);
		} else {
			this.meshTween = XenoCard.animatePosition(mesh.position, moveVector, 0.3, Power1.easeInOut);
		}

		//if(this.meshTween) {
			//console.log(this.meshTween);
			//this.meshTween.kill();
/*
start: 0
p: 0 (0->0)
m: 0

p: 10 (0->10)
m: -10

p: 10 (5->10)
m: -5

p: 20 (5->20)
m: -15


*/

		//}
/*
		if(moveVector !== undefined) {
			mesh.position.sub(moveVector);
			//mesh.position.negate();
		} else {
			moveVector = mesh.position.clone().negate();
		}
*/
	};

	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = XenoCard;
	}
})();