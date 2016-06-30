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


function getProfileShape() {
	var shape = new THREE.Shape();
	shape.moveTo(0, 8);
	shape.lineTo(1, 9);
	shape.lineTo(3, 8);
	//shape.lineTo(4, 4);
	//shape.bezierCurveTo(  3,  6,  3,  6,  4,  4);
	shape.bezierCurveTo(3.5, 6, 3.5, 5, 3.5, 4);
	//shape.lineTo(3, 0);
	//shape.bezierCurveTo(  3,  2,  3,  2,  3,  0);
	shape.bezierCurveTo(3.5, 3, 3.5, 2, 3, 0);
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


function Prototype_init() {
	var scene = this.scene;
	var loadTexture = this.getLoadTexture();
	this.setCamera(new THREE.Vector3(0, 0, 500), new THREE.Vector3(0, 0, 0));
	initLights(this);
	var xenoCard3D = new XenoCard3D();

	var profileShape = getProfileShape();
	var profileGeo = profileShape.createGeometry(getSpacedPointsWithCorners(profileShape, 6));
	profileGeo.rotateX(90 * Math.PI / 180);
	profileGeo.rotateZ(90 * Math.PI / 180);
	
	// Energy
		var energyDiscShape = getDiscShape(16);
		var energyDiscOutlineGeo = energyDiscShape.createGeometry(getSpacedPointsWithCorners(energyDiscShape, 32));
		var energyDiscGeo = extrudeProfileOnPath(profileGeo.vertices, energyDiscOutlineGeo.vertices);
	// Attack
		var attDiscShape = getDiscShape(14);
		var attDiscOutlineGeo = attDiscShape.createGeometry(getSpacedPointsWithCorners(attDiscShape, 32));
		var attDiscGeo = extrudeProfileOnPath(profileGeo.vertices, attDiscOutlineGeo.vertices);
	// HP
		var shieldSize = 13;
		var shieldShape = getShieldShape();
		var shieldOutlineGeo = shieldShape
			.createGeometry(getSpacedPointsWithCorners(shieldShape, 32));
		shieldOutlineGeo.scale(shieldSize / 20, shieldSize / 20, shieldSize / 20);
		var shieldGeo = extrudeProfileOnPath(profileGeo.vertices, shieldOutlineGeo.vertices);

	function attachIcons(card) {
		var energyMesh = new THREE.Mesh(energyDiscGeo, new THREE.MeshPhongMaterial({color: 0x31d8c8}));
		energyMesh.position.set(-60, 90, -3);
		card.add(energyMesh);
		var attMesh = new THREE.Mesh(attDiscGeo, new THREE.MeshPhongMaterial({color: 0xff2100}));
		attMesh.position.set(-60, -90, -3);
		card.add(attMesh);
		var shieldMesh = new THREE.Mesh(shieldGeo, new THREE.MeshPhongMaterial({color: 0x9b41ff}));
		shieldMesh.position.set(60, -90, -3);
		card.add(shieldMesh);
		return card;
	}

	var card, x, y, portraitTex;
	for(var i = 0; i < 20; i++) {
		portraitTex = loadTexture(getRandomPortraitUrl());
		card = xenoCard3D.createCard(portraitTex);
		x = (Math.random()*2-1)*3*cardW;
		y = (Math.random()*2-1)*2*cardH;
		card.position.set(x, y, 10);
		snapCardPosition(card.position);
		scene.add(attachIcons(card));
	}
	card = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
	card.position.set(0, 0, 100);
	scene.add(attachIcons(card));


}
function init() {
	var prototype = new THREEPrototype();
	prototype.oninit = Prototype_init;
	prototype.start();
}

document.addEventListener('DOMContentLoaded', init);
	
})();