(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var THREEPrototype = require('THREEPrototype');
var initLights = require('initLights');
var assetdata = require('assetdata');
var XenoCard3D = require('XenoCard3D');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var snapCardPosition = assetdata.snapCardPosition;
var cardInfo = assetdata.cardInfo;
var cardW = cardInfo.width, cardH = cardInfo.height;


// New Functions
	function getSpacedPointsWithCorners(curvePath, divisions) {
		var points = [];
		var curves = curvePath.curves;
		var curveCount = curves.length;
		var curveLengths = [];
		var totalLength = 0;
		var i, curveDivisions, curvePoints;
		for(i = 0; i < curveCount; i++) {
			curveLengths[i] = curves[i].getLength();
			totalLength += curveLengths[i];
		}
		var currentLength = 0;
		for(i = 0; i < curveCount; i++) {
			currentLength += curveLengths[i];
			curveDivisions = Math.round(currentLength * divisions / totalLength - points.length);
			curveDivisions = Math.max(1, curveDivisions);
			curvePoints = curves[i].getSpacedPoints(curveDivisions);
			if(i < curveCount-1) curvePoints.length--;
			points = points.concat(curvePoints);
		}
		// Trim last point if it is equal to first
		if(points[0].distanceToSquared(points[points.length-1]) < Number.EPSILON) points.length--;
		return points;
	}

function extrudeProfileOnPath(profileVs, outlineVs) {
	var upVector = new THREE.Vector3(0, 1, 0);
	var backVector = new THREE.Vector3(0, 0, -1);
	var outlineCount = outlineVs.length;
	var profileCount = profileVs.length;
	var geo = new THREE.Geometry();
	function capFront() {
		var bounds = new THREE.Box3();
		var i, a, b, c = geo.vertices.length;
		for(i = 0; i < outlineCount; i++) {
			a = i * profileCount;
			b = ((i + 1) % outlineCount) * profileCount;
			bounds.expandByPoint(geo.vertices[a]);
			geo.faces.push(new THREE.Face3(a, c, b));
		}
		geo.vertices.push(bounds.center());
	}
	function capBack() {
		var bounds = new THREE.Box3();
		var i, a, b, c = geo.vertices.length;
		for(i = 0; i < outlineCount; i++) {
			a = (i + 1) * profileCount - 1;
			b = (((i + 1) % outlineCount) + 1) * profileCount - 1;
			bounds.expandByPoint(geo.vertices[a]);
			geo.faces.push(new THREE.Face3(a, b, c));
		}
		geo.vertices.push(bounds.center());
	}
	function addSegmentFaces(segA, segB) {
		var i, a, b, c, d;
		for(i = 0; i < profileCount-1; i++) {
			a = segA + i;
			b = segB + i;
			c = a + 1;
			d = b + 1;
			geo.faces.push(new THREE.Face3(a, b, c));
			geo.faces.push(new THREE.Face3(b, d, c));
		}
	}
	var i, ii, v0, v1, v2, va, vb, vab, scaleV, ang;
	for(i = 0; i < outlineCount; i++) {
		v0 = outlineVs[(i + outlineCount - 1) % outlineCount].clone();
		v1 = outlineVs[i].clone();
		v2 = outlineVs[(i + 1) % outlineCount].clone();
		v0.z = 0;
		v1.z = 0;
		v2.z = 0;
		va = v1.clone().sub(v0).normalize();
		vb = v2.clone().sub(v1).normalize();
		vab = va.clone().add(vb).normalize();
		vab.set(-vab.y, vab.x, vab.z); // Rotate by 90 degrees clockwise
		ang = upVector.angleTo(vab); if(vab.x < 0) ang = -ang;
		scaleV = new THREE.Vector3(1, 1 / Math.sin(vab.angleTo(va)), 1);
		for(ii = 0; ii < profileCount; ii++) {
			geo.vertices.push(
				profileVs[ii].clone()
					.multiply(scaleV)
					.applyAxisAngle(backVector, ang)
					.add(outlineVs[i])
			);
		}
		var segA = (i+0) % outlineCount * profileCount;
		var segB = (i+1) % outlineCount * profileCount;
		addSegmentFaces(segA, segB);
	}
	capBack(profileVs, outlineVs, geo);
	capFront(profileVs, outlineVs, geo);
	geo.computeFaceNormals();
	return geo;
}

// Data
	function getProfileShape() {
		var shape = new THREE.Shape();
		shape.moveTo(0, 8);
		shape.lineTo(1, 9);
		shape.lineTo(3, 8);
		//shape.lineTo(4, 4);
		//shape.bezierCurveTo(  3,  6,  3,  6,  4,  4);
		shape.bezierCurveTo(  4,  6,  4,  5,  4,  4);
		//shape.lineTo(3, 0);
		//shape.bezierCurveTo(  3,  2,  3,  2,  3,  0);
		shape.bezierCurveTo(  4,  3,  4,  2,  3,  0);
		return shape;
	}
	function getShieldShape() {
		var shape = new THREE.Shape();
		shape.moveTo( 0,  20);
		shape.bezierCurveTo(  5,  15,  15,  16,  20,  16);
		shape.bezierCurveTo( 20,   0,  15, -16,   0, -20);
		shape.bezierCurveTo(-15, -16, -20,   0, -20,  16);
		shape.bezierCurveTo(-15,  16,  -5,  15,   0,  20);
		return shape;
	}
	function getDiscShape(radius) {
		var shape = new THREE.Shape();
		shape.absellipse(0, 0, radius, radius, Math.PI * 0.5, Math.PI * 0.5, true);
		return shape;
	}


// Testing
	function createWireframe(obj) {
		var wireframeMesh = new THREE.Mesh(
			obj.geometry,
			new THREE.MeshPhongMaterial({
				color: 0xffffff,
				wireframe: true,
				transparent: true,
				opacity: 0.8,
				//shading: THREE.FlatShading
			})
		);
		wireframeMesh.position.copy(obj.position);
		return wireframeMesh;
	}
	function createExtrusion(profileGeo, outlineGeo) {
		var extrusionObj = new THREE.Object3D();
		var outlineMesh = new THREE.Line(outlineGeo, new THREE.LineBasicMaterial({color: 0x00ff00}));
		outlineMesh.position.set(0, 45, 10);
		extrusionObj.add(outlineMesh);
		var shieldGeo = extrudeProfileOnPath(profileGeo.vertices, outlineGeo.vertices, extrusionObj);
		shieldGeo.computeFaceNormals();
		var extrusionMesh = new THREE.Mesh(shieldGeo, new THREE.MeshPhongMaterial({color: 0x0000ff}));
		extrusionObj.add(extrusionMesh);
		extrusionObj.add(createWireframe(extrusionMesh));
		return extrusionObj;
	}


function Prototype_init() {
	var scene = this.scene;
	var loadTexture = this.getLoadTexture();
	//this.setCamera(new THREE.Vector3(-50, 50, 150), new THREE.Vector3(-50, 50, 0));
	this.setCamera(new THREE.Vector3(00, 00, 120), new THREE.Vector3(0, 0, 0));
	initLights(this);
	var xenoCard3D = new XenoCard3D();
	var tex = loadTexture('/images/testuv.jpg');

	document.body.style.background = '#000';


	var profileDivisions = 6;
	var discDivisions = 16;
	var shieldDivisions = 7;

	var profileShape = getProfileShape();
	var shieldShape = getShieldShape();
	var discShape = getDiscShape(20);

	var profileGeo = profileShape.createGeometry(getSpacedPointsWithCorners(profileShape, profileDivisions));
	profileGeo.rotateX(90 * Math.PI / 180);
	profileGeo.rotateZ(90 * Math.PI / 180);


	// Profile
		var profileMesh = new THREE.Line(
			profileGeo,
			new THREE.LineBasicMaterial({color: 0xff0000, linewidth: 3})
		);
		profileMesh.position.set(0, 40, 10);
		scene.add(profileMesh);

		
		// disc
			var discOutlineGeo = discShape.createGeometry(getSpacedPointsWithCorners(discShape, 16));
			var extrusion1 = createExtrusion(profileGeo, discOutlineGeo);
			extrusion1.position.set(-25, 0, 0);
			scene.add(extrusion1);
			var disc1 = extrusion1.children[1];
			var extrusion2 = createExtrusion(profileGeo, discOutlineGeo);
			extrusion2.position.set(25, 0, 0);
			scene.add(extrusion2);
			var disc2 = extrusion2.children[1];


			disc1.material = new THREE.MeshPhongMaterial({
				color:0xff0000
			});
		

		//shieldOutlineGeo.vertices.forEach(function(v, idx, arr) { v.z += Math.sin(idx/arr.length * 5 * 2 * Math.PI)*5; });
		/*
			var shieldOutlineGeo = shieldShape
				.createGeometry(getSpacedPointsWithCorners(shieldShape, 5));
			var shieldExtrusion = createExtrusion(profileGeo, shieldOutlineGeo);
			shieldExtrusion.position.set(25, 0, 0).add(geoPos);
			scene.add(shieldExtrusion);
		*/
		/*
		for(var i = 4; i < 14; i++) {
			var shieldOutlineGeo = shieldShape.createGeometry(getSpacedPointsWithCorners(shieldShape, i));
			var shieldExtrusion = createExtrusion(profileGeo, shieldOutlineGeo);
			shieldExtrusion.position.set(-8*50 + i*50, 50, 0).add(geoPos);
			scene.add(shieldExtrusion);
		}
		for(var i = 14; i < 24; i++) {
			var shieldOutlineGeo = shieldShape.createGeometry(getSpacedPointsWithCorners(shieldShape, i));
			var shieldExtrusion = createExtrusion(profileGeo, shieldOutlineGeo);
			shieldExtrusion.position.set(-18*50 + i*50, -50, 0).add(geoPos);
			scene.add(shieldExtrusion);
		}
		*/
		

}
function init() {
	var prototype = new THREEPrototype();
	prototype.oninit = Prototype_init;
	prototype.start();
}

document.addEventListener('DOMContentLoaded', init);
	
})();