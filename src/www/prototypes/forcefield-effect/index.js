(function() {
/*jshint esnext: true */
var THREE = require('enhanceTHREE')(require('THREE'));
var assetdata = require('assetdata');
var XenoCard3D = require('XenoCard3D');
var GeometryHelpers = require('GeometryHelpers');
var ForcefieldEffect = require('ForcefieldEffect');
var THREEPrototype = require('THREEPrototype');
var loadDynamicMaterials = require('loadDynamicMaterials');
var initLights = require('initLights');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var normalizeUVs = GeometryHelpers.normalizeUVs;


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

function createBoundingBox(boundingBox, color) {
	if(color === undefined) color = 0x8888ff;
	var boundingBoxMesh = new THREE.Mesh(
		new THREE.BoxGeometry(boundingBox.size().x, boundingBox.size().y, boundingBox.size().z),
		new THREE.LineBasicMaterial({color: color})
	);
	boundingBoxMesh.position.copy(boundingBox.center());
	boundingBoxMesh.updateMatrixWorld();
	return new THREE.WireframeHelper(boundingBoxMesh, boundingBoxMesh.material.color);
}

function createForceFieldGeometry(card) {
	var scene = card.parent;
	var targets = ['card.collider', 'cost', 'health', 'attack']
		.map(function(name) { return card.getObjectByName(name); });
	var mergedVertices = getMergedVertices(targets);

	var boundingSphere = new THREE.Sphere();
	boundingSphere.setFromPoints(mergedVertices);
	var boundingBox = new THREE.Box3();
	boundingBox.setFromPoints(mergedVertices);
	//scene.add(createBoundingBox(boundingBox, 0x8888ff));

	var hullSpacing = 20;
	var raycaster = new THREE.Raycaster();
	function getFaceVerts(geo, idx) {
		var face = geo.faces[idx];
		var vs = geo.vertices;
		return [vs[face.a], vs[face.b], vs[face.c]];
	}
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
		throw new Error('No hit at point: '+v1.toString());
	}
	function randomPointOnFace(a, b, c) {
		var sqrErr = 0;
		var sampleCount = 50;
		var r1 = Math.random(), r2 = Math.random();
		if(1-r1 <= r2) {
			r2 = 1-r2;
			r1 = 1-r1;
		}
		return a.clone()
			.add(b.clone().sub(a).multiplyScalar(r1))
			.add(c.clone().sub(a).multiplyScalar(r2));
	}
	function calculateFaceError(geo, idx) {
		var face = geo.faces[idx];
		var [a, b, c] = getFaceVerts(geo, idx);
		var dir = face.normal.clone().negate().normalize();
		var sqrErr = 0;
		var sampleCount = 50;
		var ab = b.clone().sub(a);
		var ac = c.clone().sub(a);
		var area = ab.cross(ac).length() * 0.5;
		sampleCount = area / 100;
		//console.log('area:', area, 'sampleCount:', sampleCount);
		for(var i = 0; i < sampleCount; i++) {
			var origin = randomPointOnFace(a, b, c);
			var color = 0xff0000;
			var len = 30;
			raycaster.set(origin, dir);
			var hits = raycaster.intersectObjects(targets);
			if(hits.length > 0) {
				color = 0x00ff00;
				len = origin.distanceTo(hits[0].point);
				sqrErr += len * len;
			}
			scene.add(new THREE.ArrowHelper(dir, origin, len, color, Math.min(5, len/5), Math.min(2, len/5)));
		}
		//console.log('sqrErr:', sqrErr);
		return (sqrErr / sampleCount) * area;
	}
	function faceArea(a, b, c) {
		var ab = b.clone().sub(a);
		var ac = c.clone().sub(a);
		return ab.cross(ac).length() * 0.5;
	}
	function findMatchingVertices(geo, idx) {
		var v0 = geo.vertices[idx];
		var matches = [];
		for(var i = 0, l = geo.vertices.length; i < l; i++) {
			if(i === idx) continue;
			var v = geo.vertices[i];
			//console.log(Math.abs(v.x - v0.x) + Math.abs(v.y - v0.y) + Math.abs(v.z - v0.z));
			if((Math.abs(v.x - v0.x) + Math.abs(v.y - v0.y) + Math.abs(v.z - v0.z)) <= (Number.EPSILON * 100)) {
				matches.push(i);	
			}
		}
		return matches;
	}
	function faceHasVertex(idx) {
		return function(face) {
			return face.a === idx || face.b === idx || face.c === idx;
		};
	}
	function faceHasVertexAB(a, b) {
		var fhvA = faceHasVertex(a);
		var fhvB = faceHasVertex(b);
		return function(face) { return fhvA(face) && fhvB(face); };
	}
	function castVertex(geo, idx) {
		//console.log(Number.EPSILON * 100, Number.EPSILON);
		var origin, dir, len, color, hits;
		var vert = geo.vertices[idx];
		var norm = getVertexEdgeNormal(geo, idx);
		origin = vert;
		dir = norm.clone().negate().normalize();
		len = 20;
		color = 0xff00ff;
		raycaster.set(origin.clone().sub(dir.clone().multiplyScalar(hullSpacing)), dir);
		hits = raycaster.intersectObjects(targets);
		if(hits.length > 0) {
			color = 0x00ff00;
			hits[0].point.sub(dir.clone().multiplyScalar(hullSpacing));
			len = origin.distanceTo(hits[0].point);
			//scene.add(new THREE.ArrowHelper(dir, origin, len, color, len/5, len/10));
			vert = hits[0].point;
		}
		//scene.add(new THREE.ArrowHelper(dir, origin, len, color, len/5, len/10));
		return vert;

		/*
		//var verts = findMatchingVertices(geo, idx);
		var adjFaces = geo.faces.filter(faceHasVertex(idx));
		//verts.push(idx);
		//console.log(adjFaces, adjFaces.map(function(f) { return geo.faces.indexOf(f); }));
		var vNormal = new THREE.Vector3();
		var totalArea = 0;
		for(var i = 0, l = adjFaces.length; i < l; i++) {
			var [a, b, c] = getFaceVerts(geo, geo.faces.indexOf(adjFaces[i]));
			var area = faceArea(a, b, c);
			totalArea += area;
			//console.log(area);
			vNormal.add(adjFaces[i].normal.clone().multiplyScalar(area));
		}
		vNormal.multiplyScalar(1/(l * totalArea));
		dir = vNormal.clone().negate();
		raycaster.set(vert, dir);
		hits = raycaster.intersectObjects(targets);
		if(hits.length === 0) {
			dir = vert.clone().sub(boundingSphere.center).normalize().negate();
			raycaster.set(vert, dir);
			hits = raycaster.intersectObjects(targets);
		}
		if(hits.length > 0) {
			scene.add(new THREE.ArrowHelper(dir, vert, vert.distanceTo(hits[0].point), 0xffff00, 1, 0.5));
			//console.log(vert.distanceTo(hits[0].point));
			//vert.copy(hits[0].point);
		}
		*/
	}
	function computeEdgeNormal() {
		this.normal = new THREE.Vector3().addVectors(this.f0.normal, this.f1.normal).multiplyScalar(0.5);
		return this.normal;
	}
	function computeEdgeLength() {
		var va = this._geometry.vertices[this.a];
		var vb = this._geometry.vertices[this.b];
		return va.distanceTo(vb);
	}
	function getEdges(geo) {
		var edgeIndex = {};
		var edgeCandidates = [], i, l;
		for(i = 0; i < hull.faces.length; i++) {
			var face = hull.faces[i];
			edgeCandidates.push([face.a, face.b]);
			edgeCandidates.push([face.b, face.c]);
			edgeCandidates.push([face.c, face.a]);
		}
		for(i = 0; i < edgeCandidates.length; i++) {
			var ab = edgeCandidates[i];
			if(ab[0] <= ab[1]) {
				edgeIndex[ab[0]+' '+ab[1]] = ab;
			} else {
				edgeIndex[ab[1]+' '+ab[0]] = [ab[1], ab[0]];
			}
		}
		var edges = [];
		var edgeKeys = Object.keys(edgeIndex);
		function faceHasVertexAB(a, b) {
			var fhvA = faceHasVertex(a);
			var fhvB = faceHasVertex(b);
			return function(face) { return fhvA(face) && fhvB(face); };
		}
		for(i = 0; i < edgeKeys.length; i++) {
			var a = edgeIndex[edgeKeys[i]][0];
			var b = edgeIndex[edgeKeys[i]][1];
			var adjFaces = geo.faces.filter(faceHasVertexAB(a, b));
			var f0 = adjFaces[0];
			var f1 = adjFaces[1];
			var edgeNorm = new THREE.Vector3().addVectors(f0.normal, f1.normal).multiplyScalar(0.5);
			edges.push({
				_geometry: geo,
				a: a,
				b: b,
				f0: f0,
				f1: f1,
				normal: edgeNorm,
				length: computeEdgeLength,
				computeNormal: computeEdgeNormal
			});
		}
		return edges;
	}
	function getVertexNormal(geo, idx) {
		var adjFaces = geo.faces.filter(faceHasVertex(idx));
		var vNormal = new THREE.Vector3();
		//var totalArea = 0;
		for(var i = 0, l = adjFaces.length; i < l; i++) {
			var [a, b, c] = getFaceVerts(geo, geo.faces.indexOf(adjFaces[i]));
			//var area = faceArea(a, b, c);
			//totalArea += area;
			//vNormal.add(adjFaces[i].normal.clone().multiplyScalar(area));
			vNormal.add(adjFaces[i].normal);
		}
		//vNormal.multiplyScalar(1/(l * totalArea));
		vNormal.multiplyScalar(1/l);
		return vNormal;
	}
	function getVertexEdges(geo, idx) {
		var edges = geo.edges;
		var adjEdges = [];
		for(var i = 0, l = edges.length; i < l; i++) {
			if(edges[i].a === idx || edges[i].b === idx) {
				adjEdges.push(edges[i]);
			}
		}
		return adjEdges;
	}
	function getVertexEdgeNormal(geo, idx) {
		var edges = getVertexEdges(geo, idx);
		var normal = new THREE.Vector3();
		for(var i = 0, l = edges.length; i < l; i++) {
			var e = edges[i];
			if(e.f0.normal.clone().sub(e.f1.normal).lengthSq() > Number.EPSILON * 10) {
				normal.add(e.normal);
			}
		}
		normal.multiplyScalar(1/l);
		return normal;
	}
	function castEdge(geo, idx) {
		//console.log(edge);
		var origin, dir, len, color;
		var edge = geo.edges[idx];
		var a = edge.a;
		var b = edge.b;
		var va = geo.vertices[a];
		var vb = geo.vertices[b];
		var aNorm = getVertexEdgeNormal(geo, a);
		var bNorm = getVertexEdgeNormal(geo, b);
		//origin = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5);
		//scene.add(new THREE.ArrowHelper(edge.normal, origin, 30, 0xff00ff, 1, 0.5));
		for(var i = 0; i <= 1; i += 0.1) {
			origin = va.clone().multiplyScalar(1 - i).add(vb.clone().multiplyScalar(i));
			dir = aNorm.clone().multiplyScalar(1 - i).add(bNorm.clone().multiplyScalar(i)).normalize().negate();
			len = 10;
			color = 0xff0000;
			raycaster.set(origin, dir);
			hits = raycaster.intersectObjects(targets);
			if(hits.length > 0) {
				len = origin.distanceTo(hits[0].point);
				if(Math.abs(len - hullSpacing) <= hullSpacing * 0.33) {
					color = 0x00ff00;
				}
			}
			//scene.add(new THREE.ArrowHelper(dir, origin, len, color, len/5, len/10));
		}
	}
	function subdivideEdges(geo) {
		var sortedEdges = hull.edges.slice().sort(function(a, b) { return b.length() - a.length(); });
		//console.log(sortedEdges.map(function(e) { return e.length(); }));
		var edge = sortedEdges[0];
		var va = geo.vertices[edge.a];
		var vb = geo.vertices[edge.b];
		var f0 = edge.f0;
		var f1 = edge.f1;
		var i, l, norm;

		var fv0 = [f0.a, f0.b, f0.c];
		while(fv0[0] !== edge.a) fv0 = [fv0[1], fv0[2], fv0[0]];
		var fv1 = [f1.a, f1.b, f1.c];
		while(fv1[0] !== edge.a) fv1 = [fv1[1], fv1[2], fv1[0]];
		if(fv0[1] !== edge.b) {
			var tmp = fv0;
			fv0 = fv1;
			fv1 = tmp;
		}
		/*
		var aEdges = getVertexEdges(geo, edge.a);
		var aSharpness = 0;
		norm = aEdges[0].normal.clone();
		for(i = 1, l = aEdges.length; i < l; i++) {
			norm.sub(aEdges[i].normal);
			aSharpness += norm.length();
		}
		var bEdges = getVertexEdges(geo, edge.b);
		var bSharpness = 0;
		norm = bEdges[0].normal.clone();
		for(i = 1, l = bEdges.length; i < l; i++) {
			norm.sub(bEdges[i].normal);
			bSharpness += norm.length();
		}
		var vertBias = aSharpness / (aSharpness + bSharpness);
		*/


		//console.log(edge.a, edge.b, fv0[2], fv1[1]);
		var vc = geo.vertices[fv0[2]];
		var vd = geo.vertices[fv1[1]];
		var vertBias = 0.5;
		//var newVert = va.clone().multiplyScalar(1 - vertBias).add(vb.clone().multiplyScalar(vertBias));
		var newVert = new THREE.Vector3()
			.add(va.clone().multiplyScalar(3/8))
			.add(vb.clone().multiplyScalar(3/8))
			.add(vc.clone().multiplyScalar(1/8))
			.add(vd.clone().multiplyScalar(1/8));
		
		/*
		console.log(fv0);
		console.log(fv0[2], fv0[0], 'N');
		console.log(fv0[1], fv0[2], 'N');

		console.log(fv1);
		console.log(fv1[0], fv1[1], 'N');
		console.log(fv1[1], fv1[2], 'N');

		console.log('vertices:', geo.vertices.length);
		console.log('faces:', geo.faces.length);
		*/

		var vIdx = geo.vertices.push(newVert) - 1;

		var f0Idx = geo.faces.indexOf(f0);
		geo.faces.splice(f0Idx, 1);
		geo.faceVertexUvs[0].splice(f0Idx, 1);
		var f1Idx = geo.faces.indexOf(f1);
		geo.faces.splice(f1Idx, 1);
		geo.faceVertexUvs[0].splice(f1Idx, 1);

		geo.faces.push(new THREE.Face3(fv0[2], fv0[0], vIdx));
		geo.faceVertexUvs[0].push([new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()]);
		geo.faces.push(new THREE.Face3(fv0[1], fv0[2], vIdx));
		geo.faceVertexUvs[0].push([new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()]);
		geo.faces.push(new THREE.Face3(fv1[0], fv1[1], vIdx));
		geo.faceVertexUvs[0].push([new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()]);
		geo.faces.push(new THREE.Face3(fv1[1], fv1[2], vIdx));
		geo.faceVertexUvs[0].push([new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()]);

		//console.log('vertices:', geo.vertices.length);
		//console.log('faces:', geo.faces.length);
	}

	var hull = new THREE.BoxGeometry(boundingBox.size().x, boundingBox.size().y, boundingBox.size().z);
	//var hull = new THREE.SphereGeometry(boundingSphere.radius, 6, 3);
	var pos = boundingSphere.center;
	hull.translate(pos.x, pos.y, pos.z);
	//boundingBoxMesh.position.copy(boundingBox.center());

	hull.edges = getEdges(hull);
	var i, l;
	var verts = [];
	//console.log('edges:', hull.edges.length);
	/*
	for(i = 0, l = hull.edges.length; i < l; i++) castEdge(hull, i);
	
	for(i = 0, l = hull.vertices.length; i < l; i++) {
		verts[i] = castVertex(hull, i);
	}
	hull.vertices = verts;
	hull.verticesNeedUpdate = true;
	hull.computeFaceNormals();
	*/


	function doIteration() {
		subdivideEdges(hull);
		hull.verticesNeedUpdate = true;
		hull.elementsNeedUpdate = true;
		hull.computeFaceNormals();
		hull.edges = getEdges(hull);
		verts.length = hull.vertices.length;
		for(i = 0, l = hull.vertices.length; i < l; i++) verts[i] = castVertex(hull, i);
		hull.vertices = verts;
		hull.verticesNeedUpdate = true;
		hull.computeFaceNormals();
	}

	//setInterval(function() {
		//var iter = 10; while(iter--) doIteration();
	//}, 2000);
	var iter = 150; while(iter--) doIteration();


	var modifier = new THREE.SubdivisionModifier(1);
	modifier.modify(hull);


	//for(i = 0, l = hull.edges.length; i < l; i++) castEdge(hull, i);
	
	/*
	var mses = [];
	for(var i = 0; i < hull.faces.length; i++) {
	//for(var i = 0; i < 2; i++) {
		var mse = calculateFaceError(hull, i);
		mses.push({mse: mse, idx: i});
		//console.log('mse:', mse, mse / 50000);
		//scene.add(new THREE.ArrowHelper(dir, center, mse / 1000, 0xffff00, 5, 5));
	}
	mses.sort(function(a, b) { return a.mse - b.mse; });
	console.log(mses);
	mses.forEach(function(e, idx) {
		console.log('%s: %s', e.idx, e.mse);
		var face = hull.faces[idx];
		var [a, b, c] = getFaceVerts(hull, idx);
		var center = a.clone().add(b).add(c).multiplyScalar(1/3);
		var dir = face.normal.clone().normalize();
		scene.add(new THREE.ArrowHelper(dir, center, (15-idx)*5, 0xffff00, 5, 5));
	});
	*/

	return hull;
}
	
// Init Prototype
	function Prototype_init() {
		var scene = this.scene;
		var loadTexture = this.getLoadTexture();
		var loadShader = this.getLoadShader();
		var xenoCard3D = new XenoCard3D();
		var materialLoader = loadDynamicMaterials(this);
		var forcefieldMaterial = materialLoader.createForceFieldMaterial();
		this.setCamera(new THREE.Vector3(0, 0, 350), new THREE.Vector3(0, 0, 0));
		initLights(this);

		var backdrop = new THREE.Mesh(new THREE.PlaneGeometry(320, 180), new THREE.MeshPhongMaterial({color: 0x663366}));
		backdrop.scale.set(5, 5, 0.1);
		backdrop.position.set(0, 0, -100);
		scene.add(backdrop);

		var card1 = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
		card1.position.set(100, 0, 0);
		scene.add(card1);
		var forcefield = new ForcefieldEffect(forcefieldMaterial);
		forcefield.position.copy(card1.position);
		scene.add(forcefield);

		var card2 = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
		card2.position.set(-100, 0, 0);
		scene.add(card2);
		card2.addEventListener('meshReady', function() {
			var geo = createForceFieldGeometry(this);
			normalizeUVs(geo,
				new THREE.Vector2(-84, -115),
				new THREE.Vector2(84, 115),
				new THREE.Vector2(0, 0)
			);
			scene.add(new THREE.Mesh(geo, 
				forcefieldMaterial
				/*
				new THREE.MeshBasicMaterial({
					color: 0x333388,
					transparent: true,
					shading: THREE.FlatShading,
					opacity: 0.6
				})
				*/
			));
			scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
				color: 0x0000ff,
				transparent: true,
				opacity: 0.7,
				wireframe: true
			})));
		});

		scene.add(new THREE.WireframeHelper(forcefield, 0x00ff00));
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();