(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var SubdivisionModifier = require('SubdivisionModifier');
var SimplifyModifier = require('SimplifyModifier');
var THREEPrototype = require('THREEPrototype');
var MouseHandler = require('MouseHandler');
var MouseCursor = require('MouseCursor');
var EventDispatcher = require('EventDispatcher');
var GeometryHelpers = require('GeometryHelpers');
var XenoCard3D = require('XenoCard3D');
var XenoCard = require('XenoCard');
var initLights = require('initLights');
var createBoard = require('createBoard');
var assetdata = require('assetdata');

var geometryToJson = GeometryHelpers.geometryToJson;
var geometryFromJson = GeometryHelpers.geometryFromJson;
var geometryToObj = GeometryHelpers.geometryToObj;
var jsonToObj = GeometryHelpers.jsonToObj;

function loadResources(loader, urls) {
	function loader_onProgress(e) {
		//console.log('loader.onProgress');
		//console.log(e.currentTarget.responseURL, e.loaded, e.total);
	}
	function loader_onError(e) {
		console.log('loader.loader_onError');
		console.log(e);
	}
	function loadResource(url) {
		if(typeof onProgress !== 'function') onProgress = function(){};
		return new Promise(function(resolve, reject) {
			loader.load(url, resolve, loader_onProgress, loader_onError);
		});
	}
	if(!Array.isArray(urls)) urls = [urls];
	return Promise.all(urls.map(loadResource))
	.catch(loader_onError);
}

function fixBoatGeometry(geo) {
	geo = geo.toGeometry();
	var sailFront = [247,246,244,241,245,242,243];
	var sailRear = [251,252,256,250,249,248,255,254,253];
	var flippedFaces = []
	.concat(sailFront)
	.concat([
		239,240,
		229,230,
		326,280,279,282,273,281,272,286,285,267,268,271,298,308,305,307,321,299,320,312,311,293,300,274,283,269,294,297,103,284,266,265,287,263,288,264,290,292,291,296,270,
		323,
		322,325,324,306,304,327,278,
		214,213,215,216,
		260,259,257,258,
		103,
		238,237,
		221,222,223,224,
		275,276,277,315,316,317 // rudder
	]);
	//var excludeUvFlip = [289];
	flippedFaces.forEach(function(idx) {
		geo.faces[idx].flip();
		//if(excludeUvFlip.indexOf(idx) === -1) {
			var uvs = geo.faceVertexUvs[0][idx];
			var tmp = uvs[1];
			uvs[1] = uvs[2];
			uvs[2] = tmp;
		//}
	});
	sailFront.forEach(function(idx) { geo.faces[idx].materialIndex = 1; });
	sailRear.forEach(function(idx) { geo.faces[idx].materialIndex = 2; });

	function cloneAndFlipFace(idx) {
		var f = geo.faces[idx].clone();
		var uvs = geo.faceVertexUvs[0][idx];
		var newUvs = [uvs[0], uvs[2], uvs[1]];
		f.flip();
		geo.faces.push(f);
		geo.faceVertexUvs[0].push(newUvs);
	}
	
	sailFront.forEach(cloneAndFlipFace);
	sailRear.forEach(cloneAndFlipFace);

	geo.scale(10, 10, 10);
	geo.translate(0, 16.7, 0);
	geo.computeBoundingBox();
	var z1 = geo.vertices[189].z;
	var z2 = geo.vertices[469].z;
	geo.vertices.forEach(function(v, idx) {
		if(Math.abs(Math.abs(v.z) - Math.abs(z1)) < 0.001) {
			geo.vertices[idx].z *= 0.99; 
		}
	});
	geo.verticesNeedUpdate = true;
	geo.uvsNeedUpdate = true;
	geo.normalsNeedUpdate = true;
	geo.computeVertexNormals();
	geo.computeFaceNormals();
	return geo;
}

// Init Prototype
	function Prototype_init() {
		var app = this;
		var scene = this.scene;
		var loadTexture = this.getLoadTexture();
		var loadShader = this.getLoadShader();
		var mouseHandler = new MouseHandler({
			domElement: this.renderer.domElement,
			camera: this.camera,
			scene: scene
		});
		var pointer = new MouseCursor({scene: scene}).attach(mouseHandler);
		this.setCamera(new THREE.Vector3(0, 200, -400), new THREE.Vector3(0, 0, 0));
		initLights(this);

		var yacht;

		var tex = loadTexture('/images/testuv.jpg');
		tex.wrapS = THREE.RepeatWrapping;
		tex.wrapT = THREE.RepeatWrapping;
		tex.repeat = new THREE.Vector2(0.01, 0.01);
		var matNorm = new THREE.MeshNormalMaterial({});
		var mat0 = new THREE.MeshPhongMaterial({color: 0xffffff, side: THREE.FrontSide});
		var mat1 = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			side: THREE.FrontSide,
			//side: THREE.DoubleSide,
			//map: tex
		});
		var mat2 = new THREE.MeshPhongMaterial({color: 0x00ff00, side: THREE.FrontSide});
		var mat3 = new THREE.MeshPhongMaterial({color: 0x0000ff, side: THREE.FrontSide});

		//var plane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), mat1);
		//plane.rotation.set(-0.5 * Math.PI, 0, 0);
		//scene.add(plane);

		var surfaceW = 400, surfaceH = 400;

		function deformSurface(geo, heights, opts) {
			var w = surfaceW, h = surfaceH;
			var e = opts.e || 1;
			var n = opts.n || 1;
			var nc = opts.nc || 1;
			var z;
			var d=1;
			//var offsetX = opts.w / w, offsetY = opts.h / h;
			for(var y = 0; y < h; y++) {
				//var yy = y / (h-1) * (opts.h-1) + offsetX;
				//console.log(y, yy);
				for(var x = 0; x < w; x++) {
					//var xx = x / (w-1) * (opts.w-1) + offsetY;
					/*
					if((Math.round(xx-d) < 0) || (Math.round(xx+d) >= opts.w) ||
						 (Math.round(yy-d) < 0) || (Math.round(yy+d) >= opts.h)) {
						z = -100;
					} else {
						z = heights[Math.round(yy) * opts.w + Math.round(xx)];
							z = (
								heights[Math.round(yy-1*d) * opts.w + Math.round(xx-1*d)]+
								heights[Math.round(yy-1*d) * opts.w + Math.round(xx+0*d)]+
								heights[Math.round(yy-1*d) * opts.w + Math.round(xx+1*d)]+
								heights[Math.round(yy+0*d) * opts.w + Math.round(xx-1*d)]+
								heights[Math.round(yy+0*d) * opts.w + Math.round(xx+0*d)]+
								heights[Math.round(yy+0*d) * opts.w + Math.round(xx+1*d)]+
								heights[Math.round(yy+1*d) * opts.w + Math.round(xx-1*d)]+
								heights[Math.round(yy+1*d) * opts.w + Math.round(xx+0*d)]+
								heights[Math.round(yy+1*d) * opts.w + Math.round(xx+1*d)]
							) / 9;						
					}
					*/
					z = heights[y * opts.w + x];
					var v = geo.vertices[y * w + x];
					v.z = z * opts.zScale;
				}
			}
			//var subdivModifier = new THREE.SubdivisionModifier(1);
			//subdivModifier.modify(geo);
			//var simpModifier = new THREE.SimplifyModifier();
			//simpModifier.modify(geo);

			geo.verticesNeedUpdate = true;
			//geo.elementsNeedUpdate = true;
			//geo.uvsNeedUpdate = true;
			//geo.normalsNeedUpdate = true;
			//geo.colorsNeedUpdate = true;
			//geo.groupsNeedUpdate = true;

			//console.log(geo.vertices.length);
			//geo.mergeVertices();
			//console.log(geo.vertices.length);
			//geo.computeBoundingBox();
			//geo.computeFaceNormals();
			geo.computeVertexNormals(true);
			return geo;
		}

		var surface;
		var geo = new THREE.PlaneGeometry(1, 1, surfaceW - 1, surfaceH - 1);
		var mat = new THREE.MeshPhongMaterial({
			//color: 0xffffff,
			//shading: THREE.FlatShading,
			side: THREE.DoubleSide,
			//wireframe: true
		});
		surface = new THREE.Mesh(geo, mat);
		surface.scale.set(500, 500, 1);
		surface.rotation.set(-0.5 * Math.PI, 0, 0);
		//surface.position.set(0, 20, 0);
		scene.add(surface);
		//scene.add(new THREE.WireframeHelper(surface, 0x00ff00));
		
		var opts = {
			x: 9950, y: 13750,
			w: surfaceW, h: surfaceH,
			//e: 0.5,
			//n: 1,
			//nc: 1,
			zScale: 0.0005
		};

		function updateSurface() {
			var url = 'http://'+location.hostname+':8900/map?x='+guiOpts.x+'&y='+guiOpts.y+'&w='+guiOpts.w+'&h='+guiOpts.h+'';
			return new Promise(function(resolve, reject) {
				var img = new Image();
				img.crossOrigin = 'Anonymous';
				img.onerror = reject;
				img.onload = function() { resolve(img); };
				img.src = url;
			})
			//app.loadResourceArrayBuffer(url)
			//.then(function(res) { return new Float32Array(res); })
			.then(function(img) {
				var canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				var ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);
				var iData = ctx.getImageData(0, 0, img.width, img.height);
				var rgba = iData.data;
				var heights = [];
				for(var i = 0, l = rgba.length; i < l; i += 4) {
					var v = rgba[i];
					if(v < 3) v = 0;
					heights[i / 4] = v;
				}
				surface.geometry = deformSurface(surface.geometry, heights, guiOpts);
			});
		}
		var gui = new dat.GUI();
		var guiOpts = Object.assign({}, opts, {
			update: updateSurface
		});
		Object.keys(guiOpts).forEach(function(key) { gui.add(guiOpts, key); });
		//updateSurface();
		guiOpts.showYacht = false;
		gui.add(guiOpts, 'showYacht').onChange(function(val) {
			if(!val) scene.remove(yacht)
			else scene.add(yacht);
		});

		function processBoatGeometry(url) {
			var manager = new THREE.LoadingManager();
			var objLoader = new THREE.OBJLoader(manager);
			return loadResources(objLoader, url)
			.then(function(res) { return fixBoatGeometry(res[0].children[0].geometry); });
		}
		function loadGeometryFromJson(url) {
			return app.loadResource(url)
			.then(function(res) { return geometryFromJson(JSON.parse(res)); });
		}

		//return processBoatGeometry('/models/boat/yacht_01b.obj')
		return loadGeometryFromJson('/models/boat/yacht_02.json')
		.then(function(geo) {
			//console.log(JSON.stringify(geometryToJson(geo)));
			//console.log(jsonToObj(geometryToJson(geo)));
			console.log(geometryToObj(geo));
			return geo;
		})		
		.then(function(boatGeo) {
			yacht = new THREE.Mesh(
				boatGeo,
				new THREE.MultiMaterial([mat1, mat2, mat3])
			);
			EventDispatcher.apply(yacht);
			yacht.receiveMouseEvents = true;
			yacht.scale.set(10, 10, 10);
			scene.add(yacht);
			//scene.add(new THREE.VertexNormalsHelper(boat, 10, 0x00ff00, 1));
		});
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();