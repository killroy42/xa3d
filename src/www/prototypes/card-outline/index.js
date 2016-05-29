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

// Init Prototype
	function Prototype_init() {
		var scene = this.scene;
		var camera = this.camera;
		this.setCamera(new THREE.Vector3(0, -100, 350), new THREE.Vector3(0, -20, 0));
		initLights(this);
		var xenoCard3D = new XenoCard3D();

		var card1 = xenoCard3D.createCard(this.loadTexture(getRandomPortraitUrl()));
		scene.add(card1);
	
		card1.addEventListener('meshReady', function() {
			console.log('meshReady');
			console.time('Generate outline');
			var mesh = this.mesh;
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

			console.time('Optimize');
			var optimized = optimizeOutline(outline, 10, 1);
			console.timeEnd('Optimize');
			console.log('optimized.length:', optimized.length);
			console.log('['+optimized.map(function(v) { return '['+v.x.toFixed(4)+','+v.y.toFixed(4)+']'; }).join(',')+']');

			// Outline mesh
				var geometry = GeometryHelpers.extrudePath(outline, 1000, 3, 1);
				geometry.scale(1, 1, 20);
				var outlineMesh = new THREE.Mesh(
					geometry,
					new THREE.MeshPhongMaterial({color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0})
				);
				scene.add(outlineMesh);
				outlineMesh.position.z = 10;
				scene.add(new THREE.WireframeHelper(outlineMesh, 0x00ff00));

			// Optimized mesh
				geometry = GeometryHelpers.extrudePath(optimized, 1000, 3, 1);
				geometry.scale(1, 1, 40);
				outlineMesh = new THREE.Mesh(
					geometry,
					new THREE.MeshPhongMaterial({color: 0x0000ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7})
				);
				//outlineMesh.scale.set(1.01, 1.01, 1.01);
				scene.add(outlineMesh);
				scene.add(new THREE.WireframeHelper(outlineMesh, 0xff0000));

		});
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();