(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var THREEPrototype = require('THREEPrototype');
var GeometryHelpers = require('GeometryHelpers');
var initLights = require('initLights');
var assetdata = require('assetdata');
var XenoCard3D = require('XenoCard3D');

var getSpacedPointsWithCorners = GeometryHelpers.getSpacedPointsWithCorners;
var extrudeProfileOnPath = GeometryHelpers.extrudeProfileOnPath;
var getProfileShape = assetdata.CardIcon.getProfileShape;
var getDiscShape = assetdata.CardIcon.getDiscShape;
var getShieldShape = assetdata.CardIcon.getShieldShape;

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var snapCardPosition = assetdata.snapCardPosition;
var cardInfo = assetdata.cardInfo;
var cardW = cardInfo.width, cardH = cardInfo.height;

// Testing
	function createWireframe(obj) {
		var wireframeMesh = new THREE.Mesh(
			obj.geometry,
			new THREE.MeshPhongMaterial({
				color: 0xff00ff,
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
		//extrusionObj.add(createWireframe(extrusionMesh));
		return extrusionObj;
	}


function Prototype_init() {
	var scene = this.scene;
	var loadTexture = this.getLoadTexture();
	//this.setCamera(new THREE.Vector3(-50, 50, 150), new THREE.Vector3(-50, 50, 0));
	this.setCamera(new THREE.Vector3(0, 0, 120), new THREE.Vector3(0, 0, 0));
	initLights(this);
	var xenoCard3D = new XenoCard3D();
	var tex = loadTexture('/images/testuv.jpg');
	var tex2 = loadTexture('/images/testuv2.jpg');
	var costtex = loadTexture('/images/icon_cost_tex_128.png');
	var healthtex = loadTexture('/images/icon_health_tex_128.png');
	var attacktex = loadTexture('/images/icon_attack_tex_128.png');

	document.body.style.background = '#000';


	costtex.magFilter = THREE.NearestFilter;
	costtex.minFilter = THREE.LinearMipMapLinearFilter;
	healthtex.magFilter = THREE.NearestFilter;
	healthtex.minFilter = THREE.LinearMipMapLinearFilter;
	attacktex.magFilter = THREE.NearestFilter;
	attacktex.minFilter = THREE.LinearMipMapLinearFilter;

	var profileShape = getProfileShape();
	var shieldShape = getShieldShape();
	var discShape = getDiscShape(20);

	var profileGeo = profileShape.createGeometry(getSpacedPointsWithCorners(profileShape, 1));
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
		var discExtrusion = createExtrusion(profileGeo, discOutlineGeo);
		discExtrusion.position.set(-50, 0, 0);
		scene.add(discExtrusion);
		var discMesh = discExtrusion.children[1];
		discMesh.material = new THREE.MeshPhongMaterial({
			color:0xffffff,
			map: costtex
		});

		var discExtrusion2 = createExtrusion(profileGeo, discOutlineGeo);
		discExtrusion2.position.set(0, 0, 0);
		scene.add(discExtrusion2);
		var discMesh2 = discExtrusion2.children[1];
		discMesh2.material = new THREE.MeshPhongMaterial({
			color:0xffffff,
			map: attacktex
		});
	
	// Shield
		var shieldOutlineGeo = shieldShape.createGeometry(getSpacedPointsWithCorners(shieldShape, 16));
		//shieldOutlineGeo.vertices.forEach(function(v, idx, arr) { v.z += Math.sin(idx/arr.length * 5 * 2 * Math.PI)*5; });
		var shieldExtrusion = createExtrusion(profileGeo, shieldOutlineGeo);
		shieldExtrusion.position.set(50, 0, 0);
		scene.add(shieldExtrusion);
		var shieldMesh = shieldExtrusion.children[1];
		shieldMesh.material = new THREE.MeshPhongMaterial({
			color:0xffffff,
			map: healthtex
		});

		var shieldOutlineGeo = shieldShape.createGeometry(getSpacedPointsWithCorners(shieldShape, 256));
		shieldOutlineGeo.vertices.forEach(function(v, idx, arr) { v.z += Math.sin(idx/arr.length * 10 * 2 * Math.PI)*3; });
		var shieldExtrusion = createExtrusion(profileGeo, shieldOutlineGeo);
		shieldExtrusion.position.set(100, 0, 0);
		scene.add(shieldExtrusion);
		var shieldMesh = shieldExtrusion.children[1];
		shieldMesh.material = new THREE.MeshPhongMaterial({
			color:0xffffff,
			map: tex
		});

		var squareShape = new THREE.Shape();
		squareShape.moveTo( -20,  -20);
		squareShape.lineTo( -20, 20);
		squareShape.lineTo(   0, 20);
		//shape.moveTo( 0,  20);
		squareShape.bezierCurveTo(  5,  15,  15,  16,  20,  16);
		squareShape.bezierCurveTo( 20,   0,  15, -16,   0, -20);
		//shape.bezierCurveTo(-15, -16, -20,   0, -20,  16);
		//shape.bezierCurveTo(-15,  16,  -5,  15,   0,  20);
		//squareShape.lineTo(20, 20);
		squareShape.lineTo(-20, -20);

		var squareProfileShape = new THREE.Shape();
		squareProfileShape.moveTo( 0, 0);
		squareProfileShape.lineTo( 4, -1);
		var squareProfileGeo = squareProfileShape.createGeometry(getSpacedPointsWithCorners(squareProfileShape, 2));
		squareProfileGeo.rotateX(90 * Math.PI / 180);
		squareProfileGeo.rotateZ(90 * Math.PI / 180);

		var squareOutlineGeo = shieldShape.createGeometry(getSpacedPointsWithCorners(squareShape, 256));
		//squareOutlineGeo.vertices.forEach(function(v, idx, arr) { v.z += Math.sin(idx/arr.length * 10 * 2 * Math.PI)*3; });
		var squareExtrusion = createExtrusion(squareProfileGeo, squareOutlineGeo);
		squareExtrusion.position.set(160, 0, 0);
		scene.add(squareExtrusion);
		var squareMesh = squareExtrusion.children[1];
		squareMesh.material = new THREE.MeshPhongMaterial({
			color:0xffffff,
			map: tex2
		});
		//var wf = createWireframe(squareMesh);
		//scene.add(wf);
		//wf.position.set(160, 0, 0);


		/*
		var shieldExtrusion2 = createExtrusion(profileGeo, shieldOutlineGeo);
		shieldExtrusion2.position.set(30, 0, 0);
		shieldExtrusion2.rotation.set(0, Math.PI, 0);
		scene.add(shieldExtrusion2);
		var shieldMesh2 = shieldExtrusion2.children[1];
		shieldMesh2.material = new THREE.MeshPhongMaterial({
			color:0xffffff,
			map: tex
		});
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