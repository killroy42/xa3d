(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var ThreeBSP = require('ThreeBSP');
var THREEPrototype = require('THREEPrototype');
var initLights = require('initLights');
var assetdata = require('assetdata');
var XenoCard3D = require('XenoCard3D');
var GeometryHelpers = require('GeometryHelpers');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var snapCardPosition = assetdata.snapCardPosition;
var cardOutline = assetdata.cardOutline;
var radialSort = GeometryHelpers.radialSort;
var optimizeOutline = GeometryHelpers.optimizeOutline;
var convexHull = GeometryHelpers.convexHull;

function castEdge(mesh, start, end, dir, divisions) {
	/*
		var posArr = mesh.geometry.attributes.position.array;
		function getVector(idx) {
			return new THREE.Vector3(
				posArr[idx * 3 + 0],
				posArr[idx * 3 + 1],
				posArr[idx * 3 + 2]
			);
		}
	*/
	var raycaster = new THREE.Raycaster();
	var points = [];
	mesh.geometry.computeBoundingSphere();
	var offset = dir.clone().multiplyScalar(mesh.geometry.boundingSphere.radius * 2);
	start.sub(offset);
	end.sub(offset);
	var delta = end.clone().sub(start);
	//console.log('delta:', delta.toString());
	for(var i = 0; i <= divisions; i++) {
		var origin = delta.clone().multiplyScalar(i / divisions).add(start);
		//console.log(origin);
		raycaster.set(origin, dir);
		var hits = raycaster.intersectObject(mesh);
		if(hits.length > 0) {
			var p = hits[0].point;
			/*
			var a = getVector(hits[0].face.a);
			var b = getVector(hits[0].face.b);
			var c = getVector(hits[0].face.c);
			var la = a.sub(p).length();
			var lb = b.sub(p).length();
			var lc = c.sub(p).length();
			if(lb < la && lb < lc) {
				p.add(b);
			} else if(lc < la) {
				p.add(c);
			} else {
				p.add(a);
			}
			*/
			points.push(p);
		}
	}
	return points;
}

function showOutline(scene, outline, color) {
	for(var i = 0, l = outline.length; i < l; i++) {
		var v0 = outline[i];
		var v1 = outline[(i + 1) % outline.length];
		var origin = v0;
		var dir = v1.clone().sub(v0).normalize();
		var len = v0.distanceTo(v1);
		scene.add(new THREE.ArrowHelper(dir, origin.clone().add(new THREE.Vector3(0, 0, 0)), Math.max(1.1, len), color, 1, 0.5));
	}
}

function getMergedVertices(targets) {
	return [].concat.apply([], targets.map(function(target) {
		target.updateMatrixWorld();
		var vertices = target.geometry.vertices;
		if(vertices === undefined) vertices = target.geometry.toGeometry().vertices;
		return vertices.map(function(v) {
			v = v.clone();
			return target.localToWorld(v);
		});
	}));
}

function createBoundingSphere(boundingSphere, segments, color) {
	if(segments === undefined) segments = 16;
	if(color === undefined) color = 0x8888ff;
	var boundingSphereMesh = new THREE.Mesh(
		new THREE.SphereGeometry(boundingSphere.radius, segments, segments),
		new THREE.LineBasicMaterial({color: color})
	);
	boundingSphereMesh.position.copy(boundingSphere.center);
	boundingSphereMesh.updateMatrixWorld();
	return new THREE.WireframeHelper(boundingSphereMesh, boundingSphereMesh.material.color);
}

function createBoundingBox(boundingBox, color) {
	if(color === undefined) color = 0x8888ff;
	var boundingBoxMesh = new THREE.Mesh(
		new THREE.BoxGeometry(boundingBox.getSize().x, boundingBox.getSize().y, boundingBox.getSize().z),
		new THREE.LineBasicMaterial({color: color})
	);
	boundingBoxMesh.position.copy(boundingBox.getCenter());
	boundingBoxMesh.updateMatrixWorld();
	return new THREE.WireframeHelper(boundingBoxMesh, boundingBoxMesh.material.color);
}

function findCorners(scene, boundingSphere, axis, targets) {
	var DEBUG = true;
	var MAX_FACES = 1000;
	var raycaster = new THREE.Raycaster();
	// Face comparisson
		var faceNormalTolerance = 0.001;//2 * Number.EPSILON;
		function compareFaceNormals(f1, f2) {
			/*
			var n1 = f1.normal.clone(), n2 = f2.normal.clone();
			n1.z = 0; n1.normalize();
			n2.z = 0; n2.normalize();
			return Math.abs(n2.x - n1.x) + Math.abs(n2.y - n1.y) <= faceNormalTolerance;
			*/
			var sqErr = f1.normal.clone().sub(f2.normal).lengthSq();
			return sqErr <= faceNormalTolerance;
		}
		function compareFaceVertices(f1, f2) {
			var v1 = [f1.a, f1.b, f1.c];
			return v1.indexOf(f2.a) !== -1 && v1.indexOf(f2.b) !== -1 && v1.indexOf(f2.c) !== -1;
		}
	// Face edge scanning
		var faceEdgeScanWidth = boundingSphere.radius * 2;
		var faceEdgeScanDepth = 0.1;
		var faceEdgeTolerance = 0.1;
		function getFaceEdge(hit, debug) {
			function scanFaceEdge(face, dir, originMin, originMax) {
				var originMid = originMin.clone().add(originMax).multiplyScalar(0.5);
				raycaster.set(originMid, dir);
				hits = raycaster.intersectObjects(targets);
				if(hits.length === 0) return scanFaceEdge(face, dir, originMin, originMid); // mid missed
				var len = originMid.distanceTo(hits[0].point);
				if(len > faceEdgeScanDepth * 2) return scanFaceEdge(face, dir, originMin, originMid); // hit face far away
				if(debug) scene.add(new THREE.ArrowHelper(dir, originMid, originMid.distanceTo(hits[0].point), 0xffff00, 0.0002, 0.0001));
				if(compareFaceNormals(face, hits[0].face)) { // mid same face
					if(originMin.distanceTo(originMax) < faceEdgeTolerance) {
						return hits[0]; // Return hit
					} else {
						return scanFaceEdge(face, dir, originMid, originMax); // Scan mid->max
					}
				}
				return scanFaceEdge(face, dir, originMin, originMid); // Scan min->mid
			}
			var scanWidth = faceEdgeScanWidth;
			var norm = hit.face.normal.clone();
			norm.z = 0;
			norm.normalize();
			var dir = norm.clone().negate();
			var originMin = hit.point.clone().add(norm.clone().multiplyScalar(faceEdgeScanDepth));
			var normPerp = new THREE.Vector3(norm.y, -norm.x, norm.z);
			raycaster.set(originMin, normPerp);
			hits = raycaster.intersectObjects(targets);
			if(hits.length > 0) {
				scanWidth = Math.min(scanWidth, originMin.distanceTo(hits[0].point));
			}
			if(debug) scene.add(new THREE.ArrowHelper(normPerp, originMin, scanWidth, 0xffffff, 0.02, 0.01));
			var originMax = originMin.clone().add(normPerp.clone().multiplyScalar(scanWidth));
			return scanFaceEdge(hit.face, dir, originMin, originMax);
		}
	// Next face scanning
		var angleStep = 10 * Math.PI / 180;
		var scanDistance = 0.5;
		var scanDepth = 0.5;
		function scanNextHit(hit, debug) {
			var dir = hit.face.normal.clone();
			dir.z = 0;
			origin = hit.point;
			for(var ang = -0.5 * Math.PI; ang < 1.5 * Math.PI; ang += angleStep) {
				var dir2 = dir.clone().applyAxisAngle(axis, ang);
				if(debug) scene.add(new THREE.ArrowHelper(dir2, origin, scanDistance, 0xff0000, 0.02, 0.01));
				var scanOrigin = origin.clone().add(dir2.clone().multiplyScalar(scanDistance));
				var scanDir = new THREE.Vector3(dir2.y, -dir2.x, dir2.z);
				scanOrigin.sub(scanDir.clone().multiplyScalar(scanDepth));
				if(debug) scene.add(new THREE.ArrowHelper(scanDir, scanOrigin, scanDepth, 0xffff00, 0.02, 0.01));
				raycaster.set(scanOrigin, scanDir);
				var hits = raycaster.intersectObjects(targets);
				if(hits.length === 0) continue;
				var len = scanOrigin.distanceTo(hits[0].point);
				if(len < scanDepth) return hits[0];
			}
		}
	// Find corners from face hits
		function computeCorners(hits, debug) {
			var corners = [];
			// Find corners
			for(i = 0; i < hitList.length; i += 2) {
				var h0 = hitList[i + 0];
				var h1 = hitList[i + 1];
				var n0 = h0.face.normal.clone(); n0.z = 0; n0.normalize();
				var n1 = h1.face.normal.clone(); n1.z = 0; n1.normalize();
				var a = h1.point.clone().sub(h0.point);
				var aInv = a.clone().negate();
				var b = new THREE.Vector3(n0.y, -n0.x, n0.z);
				var c = new THREE.Vector3(-n1.y, n1.x, n0.z);
				var angA = n0.angleTo(n1); if(n1.x < 0) angA = -angA;
				angA = Math.PI - angA;
				var angB = c.angleTo(aInv);
				var angC = b.angleTo(a);
				var aLen = a.length();
				var bLen = aLen / Math.sin(angA) * Math.sin(angB);
				var cLen = aLen / Math.sin(angA) * Math.sin(angC);
				var pb = h0.point.clone().add(b.clone().normalize().multiplyScalar(bLen));
				//var pc = h1.point.clone().add(c.clone().normalize().multiplyScalar(cLen));
				var cornerNormal = n0.clone().add(n1).multiplyScalar(0.5).normalize();
				if(debug) {
					scene.add(new THREE.ArrowHelper(n0, h0.point, 10, 0xff0000, 1, 0.5));
					scene.add(new THREE.ArrowHelper(n1, h1.point, 10, 0x00ff00, 1, 0.5));
					scene.add(new THREE.ArrowHelper(cornerNormal, pb, 10, 0xff00ff, 1, 0.5));
				}
				corners.push({
					point: pb,
					normal: cornerNormal,
					faces: [h0.face, h1.face]
				});
			}
			return corners;
		}
	var origin = boundingSphere.center.clone().add(new THREE.Vector3(0, boundingSphere.radius, 0));
	raycaster.set(origin, new THREE.Vector3(0, -1, 0));
	var hits = raycaster.intersectObjects(targets);
	if(hits.length === 0) throw new Error('Not hit on first raycast');
	var faceEnd = getFaceEdge(hits[0]);
	var firstHit = faceEnd;
	var hitList = [];
	// Collect face hits
		for(var i = 0; i < MAX_FACES; i++) {
			faceStart = scanNextHit(faceEnd, DEBUG);
			if(!compareFaceNormals(faceEnd.face, faceStart.face)) {
				hitList.push(faceEnd);
				hitList.push(faceStart);
			}
			faceEnd = getFaceEdge(faceStart, DEBUG);
			if(compareFaceVertices(firstHit.face, faceEnd.face)) break;
		}
	if(DEBUG) console.log('hits:', hitList.length);
	var corners = computeCorners(hits, DEBUG);
	if(DEBUG) console.log('corners:', corners.length);
	return corners;
}

function castOutline1(card) {
	console.time('Generate outline');
	var mesh = card.mesh;
	mesh.geometry.computeBoundingBox();
	var bb = mesh.geometry.boundingBox;
	var z = -0.01;
	var divs = 100;
	var inset = 0.1;
	var edges = {
		top: {
			start: new THREE.Vector3(bb.min.x + inset, bb.max.y, z),
			end: new THREE.Vector3(0, bb.max.y, z),
			dir: new THREE.Vector3(0, -1, 0).normalize(),
		},
		bottom: {
			start: new THREE.Vector3(bb.min.x + inset, bb.min.y - 10, z),
			end: new THREE.Vector3(0, bb.min.y - 10, z),
			dir: new THREE.Vector3(0, 1, 0).normalize(),
		},
		left: {
			start: new THREE.Vector3(bb.min.x - 10, bb.max.y - inset, z),
			end: new THREE.Vector3(bb.min.x - 10, bb.min.y + inset, z),
			dir: new THREE.Vector3(1, 0, 0).normalize(),
		},
		topLeft: {
			start: new THREE.Vector3(bb.min.x, bb.min.y, z),
			end: new THREE.Vector3(bb.max.x, bb.max.y, z),
			dir: new THREE.Vector3(1, -1, 0).normalize(),
		},
		bottomLeft: {
			start: new THREE.Vector3(bb.min.x, bb.max.y, z),
			end: new THREE.Vector3(bb.max.x, bb.min.y, z),
			dir: new THREE.Vector3(1, 1, 0).normalize(),
		},
	};
	// Raycasting
		console.time('Raycasting');
		var outline = [];
		var edge;
		edge = edges.top;
		outline = outline.concat(castEdge(mesh, edge.start, edge.end, edge.dir, divs));
		edge = edges.topLeft;
		outline = outline.concat(castEdge(mesh, edge.start, edge.end, edge.dir, divs));
		edge = edges.left;
		outline = outline.concat(castEdge(mesh, edge.start, edge.end, edge.dir, divs));
		edge = edges.bottomLeft;
		outline = outline.concat(castEdge(mesh, edge.start, edge.end, edge.dir, divs));
		edge = edges.bottom;
		outline = outline.concat(castEdge(mesh, edge.start, edge.end, edge.dir, divs));
		// Remove right side
		outline = outline.filter(function(p) { return p.x <= 0; });
		// Mirror left to right
		outline = outline.concat(outline.map(function(p) {
			p = p.clone();
			p.x = -p.x;
			return p;
		}));
		console.timeEnd('Raycasting');
	console.log('outline.length:', outline.length);
	//outline = cardOutline.map(function(p) { return new THREE.Vector3(p[0], p[1], 0); });
	//console.time('create hull');
	//outline = convexHull(outline, 2)
		//.map(function(p) { return new THREE.Vector3(p[0], p[1], 0); });
	//console.timeEnd('create hull');
	console.time('radialSort');
	outline = radialSort(outline);
	console.timeEnd('radialSort');
	return outline;
}

function castOutline2(card) {
	var scene = card.parent;
	var targets = ['card.body', 'cost', 'health', 'attack']
		.map(function(name) { return card.getObjectByName(name); })
		.filter(item => item !== undefined);
	var mergedVertices = getMergedVertices(targets);
	// boundingSphere
		var boundingSphere = new THREE.Sphere();
		boundingSphere.setFromPoints(mergedVertices);
		scene.add(createBoundingSphere(boundingSphere, 16, 0x8888ff));
	// boundingBox
		var boundingBox = new THREE.Box3();
		boundingBox.setFromPoints(mergedVertices);
		scene.add(createBoundingBox(boundingBox, 0x8888ff));
	// Outline
		var raycaster = new THREE.Raycaster();
		function raycastPoint(v0, v1, v2, showArrows) {
			var va = v1.clone().sub(v0).normalize();
			var vb = v2.clone().sub(v1).normalize();
			var vab = va.clone().add(vb).normalize();
			vab.set(vab.y, -vab.x, vab.z);
			var origin = v1.clone().sub(vab.clone().multiplyScalar(v0.distanceTo(v2) * 0.5));
			var dir = vab;
			var len = 100;
			raycaster.set(origin, dir);
			var hits = raycaster.intersectObjects(targets);
			if(hits.length > 0) {
				var hit = hits[0];
				len = origin.distanceTo(hit.point);
				if(showArrows === true) scene.add(new THREE.ArrowHelper(dir, origin, Math.max(1.1, len), 0x00ff00, 1, 0.5));
				return hit.point;
			}
			if(showArrows === true) scene.add(new THREE.ArrowHelper(dir, origin, Math.max(1.1, len), 0x00ff00, 1, 0.5));
			console.log(hits);
			console.log(origin);
			console.log(dir);
			console.log(targets);
			console.log(card);
			throw new Error('No hit at point: '+v1.toString());
		}
		function raycastOutline(outline, showArrows) {
			var i = outline.length; while(i--) {
				var v0 = outline[(i + outline.length - 1) % outline.length];
				var v1 = outline[i];
				var v2 = outline[(i + 1) % outline.length];
				outline[i] = raycastPoint(v0, v1, v2, showArrows);
			}
		}
		function subdivideOutline(outline) {
			var newOutline = [], i, l;
			for(i = 0, l = outline.length; i < l; i++) {
				var v0 = outline[i];
				var v2 = outline[(i + 1) % outline.length];
				var v1 = v0.clone().add(v2).multiplyScalar(0.5);
				newOutline.push(v0);
				newOutline.push(raycastPoint(v0, v1, v2, true));
			}
			outline.length = newOutline.length;
			for(i = 0, l = outline.length; i < l; i++) {
				outline[i] = newOutline[i];
			}
		}
		var outline = [
			new THREE.Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.getCenter().z),
			new THREE.Vector3(boundingBox.max.x, boundingBox.min.y, boundingBox.getCenter().z),
			new THREE.Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.getCenter().z),
			new THREE.Vector3(boundingBox.min.x, boundingBox.max.y, boundingBox.getCenter().z)
		];
		raycastOutline(outline, true);
		var iterations = 4;
		for(var i = 0; i < iterations; i++) subdivideOutline(outline);
		console.log('outline:', outline.length);
		//showOutline(scene, outline, 0xffff00);
		outline.forEach(function(v) { card.worldToLocal(v); });
		return outline;
}

function castOutline3(card) {
	var scene = card.parent;
	var targets = ['card.body', 'cost', 'health', 'attack']
		.map(function(name) { return card.getObjectByName(name); })
		.filter(item => item !== undefined);
	var mergedVertices = getMergedVertices(targets);
	var boundingSphere = new THREE.Sphere();
	boundingSphere.setFromPoints(mergedVertices);
	card.position.z -= 2;
	card.updateMatrixWorld();

	var corners = findCorners(scene, boundingSphere, new THREE.Vector3(0, 0, -1), targets);
	var outline = corners.map(function(corner) { return corner.point; });
	//showOutline(scene, outline, 0xffff00);
	outline.forEach(function(v) { card.worldToLocal(v); });
	
	card.position.z += 2;
	card.updateMatrixWorld();

	// Outline to JSON
	//console.log(JSON.stringify(outline.map(function(v){ return [Number(v.x.toFixed(4)), Number(v.y.toFixed(4))]; })));

	return outline;
}

function visualizeOutline(card, outline) {
	var scene = card.parent;
	console.time('Optimize');
	var optimized = optimizeOutline(outline, 10, 1);
	console.timeEnd('Optimize');
	// Outline mesh
		var geometry = GeometryHelpers.extrudePath(outline, 1000, 3, 1);
		geometry.scale(1, 1, 20);
		var outlineMesh = new THREE.Mesh(
			geometry,
			new THREE.MeshPhongMaterial({color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0})
		);
		scene.add(outlineMesh);
		outlineMesh.position.copy(card.position).add(new THREE.Vector3(0, 0, 10));
		scene.add(new THREE.WireframeHelper(outlineMesh, 0x00ff00));
	/*
	// Optimized mesh
		geometry = GeometryHelpers.extrudePath(optimized, 1000, 3, 1);
		geometry.scale(1, 1, 40);
		outlineMesh = new THREE.Mesh(
			geometry,
			new THREE.MeshPhongMaterial({color: 0x0000ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7})
		);
		//outlineMesh.scale.set(1.01, 1.01, 1.01);
		outlineMesh.position.copy(card.position).add(new THREE.Vector3(0, 0, 10));
		scene.add(outlineMesh);
		scene.add(new THREE.WireframeHelper(outlineMesh, 0xff0000));
	*/
}

// Init Prototype
	function Prototype_init() {
		var scene = this.scene;
		var camera = this.camera;
		this.setCamera(new THREE.Vector3(0, 0, 300), new THREE.Vector3(0, 0, 0));
		initLights(this);
		var xenoCard3D = new XenoCard3D();

		THREE.WireframeHelper = function(mesh, color) {
			var wireframe = new THREE.WireframeGeometry(mesh.geometry);
			THREE.LineSegments.call(this, wireframe);
			this.material.depthTest = false;
			this.material.opacity = 0.25;
			this.material.transparent = true;
			this.material.color.set(color);
		};
		THREE.WireframeHelper.prototype = Object.create(THREE.LineSegments.prototype);
			
		var card1 = xenoCard3D.createCard(this.loadTexture(getRandomPortraitUrl()));
		card1.position.set(-180, 0, 0);
		scene.add(card1);
		card1.addEventListener('meshReady', function() { visualizeOutline(this, castOutline1(this)); });
				
		var card2 = xenoCard3D.createCard(this.loadTexture(getRandomPortraitUrl()));
		card2.position.set(0, 0, 0);
		scene.add(card2);
		card2.addEventListener('meshReady', function() { visualizeOutline(this, castOutline2(this)); });
				
		var card3 = xenoCard3D.createCard(this.loadTexture(getRandomPortraitUrl()));
		card3.position.set(180, 0, -4);
		scene.add(card3);
		card3.addEventListener('meshReady', function() { visualizeOutline(this, castOutline3(this)); });
		
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();