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

var radialSort = GeometryHelpers.radialSort;
var optimizeOutline = GeometryHelpers.optimizeOutline;
var convexHull = GeometryHelpers.convexHull;
var getSpacedPointsWithCorners = GeometryHelpers.getSpacedPointsWithCorners;
var extrudeProfileOnPath = GeometryHelpers.extrudeProfileOnPath;
var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var snapCardPosition = assetdata.snapCardPosition;
var cardOutline = assetdata.cardOutline;
var getProfileShape = assetdata.CardIcon.getProfileShape;
var getDiscShape = assetdata.CardIcon.getDiscShape;
var getShieldShape = assetdata.CardIcon.getShieldShape;

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

		var raycaster = new THREE.Raycaster();
		var targets = new THREE.Object3D();
		var rays = new THREE.Object3D();

		var RAY_DEFAULT_LENGTH = 300;
		var RAY_DEFAULT_COLOR = 0xffff00;
		var RAY_HIT_COLOR = 0xff0000;

		scene.add(targets);
		scene.add(rays);

		function createRay(from, to) {
			var origin = from.clone();
			var dir = to.clone().sub(from).normalize();
			var len = RAY_DEFAULT_LENGTH;
			var color = RAY_DEFAULT_COLOR;
			return new THREE.ArrowHelper(dir, origin, len, color, 20);
		}

		function castRay(ray) {
			var origin = ray.position;
			var dir = new THREE.Vector3(0, 1, 0);
			var len = RAY_DEFAULT_LENGTH;
			var color = RAY_DEFAULT_COLOR;
			dir.applyQuaternion(ray.quaternion);
			raycaster.set(origin, dir);
			var hits = raycaster.intersectObjects(targets.children);
			if(hits.length > 0) {
				var hit = hits[0];
				len = origin.distanceTo(hit.point);
				color = RAY_HIT_COLOR;
			}
			ray.setLength(len, 20, 5);
			ray.setColor(new THREE.Color(color));
		}

		// Create rays
			var spacing = 10;
			for(var y = -100/spacing; y <= 100/spacing; y++) {
				for(var x = -100/spacing; x <= 100/spacing; x++) {
					rays.add(createRay(
						new THREE.Vector3(x*spacing, y*spacing, 150),
						new THREE.Vector3(x*spacing, y*spacing, -150)
					));
				}
			}

		var box = new THREE.Mesh(
			new THREE.BoxGeometry(100, 100, 100),
			new THREE.MeshPhongMaterial({color: 0xff0000})
		);
		targets.add(box);

		var geo1 = new THREE.Geometry();
		geo1.vertices = [
			new THREE.Vector3(-100, -100, 10),
			new THREE.Vector3(100, -100, 50),
			new THREE.Vector3(-100, 100, 0)
		];
		geo1.faces = [
			new THREE.Face3(0, 1, 2)
		];
		var mesh1 = new THREE.Mesh(
			geo1,
			new THREE.MeshPhongMaterial({color: 0x00ff00})
		);
		targets.add(mesh1);


		// Profile
			/*
			var height = 40;
			var profileShape = new THREE.Shape();
			profileShape.moveTo(0, 0.5 * height);
			profileShape.lineTo(0, -0.5 * height);
			*/
			var profileShape = getProfileShape();
			var profileGeo = profileShape.createGeometry(getSpacedPointsWithCorners(profileShape, 1));
			profileGeo.rotateX(90 * Math.PI / 180);
			profileGeo.rotateZ(90 * Math.PI / 180);
			var profileMesh = new THREE.Line(profileGeo, new THREE.LineBasicMaterial({color: 0x00ff00}));
			profileMesh.position.set(0, 200, 0);
			scene.add(profileMesh);

		// Outline
			var radius = 40;
			//var outlineShape = new THREE.Shape();
			//outlineShape.moveTo(0, radius);
			//outlineShape.lineTo(radius, 0);
			//outlineShape.lineTo(0, -radius);
			//outlineShape.lineTo(-radius, 0);
			//outlineShape.lineTo(0, radius);
			//var outlineShape = getDiscShape(radius);
			var outlineShape = getShieldShape();
			var outlineGeo = outlineShape.createGeometry(getSpacedPointsWithCorners(outlineShape, 32));
			var outlineMesh = new THREE.Line(outlineGeo, new THREE.LineBasicMaterial({color: 0x00ffff}));
			outlineMesh.position.set(50, 200, 0);
			scene.add(outlineMesh);

		var extrusionGeo = extrudeProfileOnPath(profileGeo.vertices, outlineGeo.vertices, scene);
		var extrusionMesh = new THREE.Mesh(extrusionGeo, new THREE.MeshPhongMaterial({color: 0x0000ff}));
		extrusionMesh.position.set(80, 60, -20);
		targets.add(extrusionMesh);

		this.onrender = function(time) {
			box.rotation.x = time * 0.001;
			box.rotation.y = time * 0.0003;
			extrusionMesh.rotation.x = time * 0.001;
			extrusionMesh.rotation.y = time * 0.0003;
			rays.children.forEach(castRay);
		};


		var profileShape = new THREE.Shape();
		profileShape.moveTo(0, 20);
		profileShape.lineTo(0, -20);

	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();