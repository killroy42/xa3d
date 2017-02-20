(function () {
	var THREE = require('THREE');
	var EventDispatcher = require('../xeno/EventDispatcher');
	var AnimationHelpers = require('AnimationHelpers');
	var GeometryHelpers = require('GeometryHelpers');
	var assetdata = require('assetdata');

	var animatePosition = AnimationHelpers.animatePosition;
	var getSpacedPointsWithCorners = GeometryHelpers.getSpacedPointsWithCorners;
	var extrudeProfileOnPath = GeometryHelpers.extrudeProfileOnPath;
	var getProfileShape = assetdata.CardIcon.getProfileShape;
	var getDiscShape = assetdata.CardIcon.getDiscShape;
	var getShieldShape = assetdata.CardIcon.getShieldShape;


	function XenoCard3D() {
		var manager = new THREE.LoadingManager();
		var objLoader = new THREE.OBJLoader(manager);
		var textureLoader = new THREE.TextureLoader(manager);
		textureLoader.crossOrigin = 'Anonymous';
		this.loadingManager = manager;
		this.objLoader = objLoader;
		this.textureLoader = textureLoader;
	}
	XenoCard3D.MODEL_BODY_URL = '/models/card/body.obj';
	XenoCard3D.MODEL_FACE_URL = '/models/card/face.obj';
	XenoCard3D.MODEL_TEXT_URL = '/models/card/text.obj';
	XenoCard3D.TEXTURE_BODY_URL = '/models/card/body.jpg';
	XenoCard3D.TEXTURE_FACE_URL = '/models/card/face.jpg';
	XenoCard3D.TEXTURE_TEXT_URL = '/models/card/text.jpg';
	XenoCard3D.TEXTURE_COSTICON_URL = '/images/icon_cost_tex_128.png';
	XenoCard3D.TEXTURE_ATTACKICON_URL = '/images/icon_attack_tex_128.png';
	XenoCard3D.TEXTURE_HEALTHICON_URL = '/images/icon_health_tex_128.png';
	XenoCard3D.CARD_WIDTH = 168;
	XenoCard3D.CARD_HEIGHT = 230;
	XenoCard3D.GEOMETRY_SCALE = 0.95;
	XenoCard3D.GEOMETRY_OFFSET = new THREE.Vector3(0, 3, 0);
	XenoCard3D.PORTRAIT_SCALE = 0.37;
	XenoCard3D.FORWARDED_EVENTS = ['mousemove', 'mousedown', 'mouseup', 'click', 'dragstart', 'dragfinish', 'drag', 'mouseenter', 'mouseleave'];
	XenoCard3D.animateMesh = function(mesh, moveVector, snap, done) {
		if(snap !== false) snap = true;
		//console.info('XenoCard3D.animateMesh(mesh, %s, %s, done);', moveVector.toString(), snap);
		var duration = 0.1;
		var easing = Power4.easeOut;
		if(snap === false) {
			duration = 0.3;
			easing = Power4.easeInOut;
		}
		if(mesh.meshTween) {
			mesh.meshTween.kill();
			moveVector.sub(mesh.position);
			mesh.position.set(0, 0, 0);
			easing = Power4.easeOut;
		}
		mesh.position.sub(moveVector);
		var meshVector = mesh.position.clone().negate();
		mesh.meshTween = animatePosition(mesh.position, moveVector, duration, easing, done);
	};
	XenoCard3D.prototype = Object.create(null);
	XenoCard3D.prototype.constructor = XenoCard3D;
	XenoCard3D.prototype.createCard = function(portraitTex) {
		var card = new THREE.Object3D();
		EventDispatcher.apply(card);
		card.name = 'card';
		//card.receiveMouseEvents = true;
		card.childrenReceiveMouseEvents = true;
		if(this.textures === undefined) this.textures = this.loadTextures();
		if(this.geometries === undefined) this.geometries = this.loadGeometries();
		var textures = this.textures;
		this.geometries.then(function(res) {
			var body = new THREE.Mesh(res.body, new THREE.MeshPhongMaterial({color: 0xffffff, map: textures.body}));
			var face = new THREE.Mesh(res.face, new THREE.MeshPhongMaterial({color: 0xffffff, map: textures.face}));
			var text = new THREE.Mesh(res.text, new THREE.MeshPhongMaterial({color: 0xffffff, map: textures.text}));
			var portrait = new THREE.Mesh(res.portrait, new THREE.MeshPhongMaterial({color: 0xffffff, map: portraitTex}));
			body.name = 'card.body';
			face.name = 'card.face';
			text.name = 'card.text';
			portrait.name = 'card.portrait';
			card.mesh = body;
			card.add(card.mesh);
			body.add(face);
			body.add(text);
			body.add(portrait);
			/*
			var collider = new THREE.Mesh(res.body, new THREE.MeshBasicMaterial({color: 0x000000, visible: false}));
			collider.name = 'card.collider';
			collider.receiveMouseEvents = true;
			collider.draggable = true;
			card.collider = collider;
			var eventForwarder = function(e) { card.dispatchEvent(e); };
			XenoCard3D.FORWARDED_EVENTS.forEach(function(eventName) {
				collider.addEventListener(eventName, eventForwarder);
			});
			card.add(card.collider);
			*/
			// Icons
				textures.costIcon.magFilter = THREE.NearestFilter;
				textures.costIcon.minFilter = THREE.LinearMipMapLinearFilter;
				var costMesh = new THREE.Mesh(res.costIcon, new THREE.MeshPhongMaterial({color: 0xffffff, map: textures.costIcon}));
				costMesh.name = 'cost';
				costMesh.position.set(-60, 90, -3);
				card.add(costMesh);
				textures.attackIcon.magFilter = THREE.NearestFilter;
				textures.attackIcon.minFilter = THREE.LinearMipMapLinearFilter;
				var attackMesh = new THREE.Mesh(res.attackIcon, new THREE.MeshPhongMaterial({color: 0xffffff, map: textures.attackIcon}));
				attackMesh.name = 'attack';
				attackMesh.position.set(-60, -90, -3);
				card.add(attackMesh);
				textures.healthIcon.magFilter = THREE.NearestFilter;
				textures.healthIcon.minFilter = THREE.LinearMipMapLinearFilter;
				var healthMesh = new THREE.Mesh(res.healthIcon, new THREE.MeshPhongMaterial({color: 0xffffff, map: textures.healthIcon}));
				healthMesh.name = 'health';
				healthMesh.position.set(60, -90, -3);
				card.add(healthMesh);
			card.dispatchEvent({type: 'meshReady'});
		});
		card.animateVector = function(moveVector, snap) {
			return XenoCard3D.animateMesh(this.mesh, moveVector, snap, function() {
				//console.info('createCard > animateVector > done!');
			});
		};
		return card;
	};
	XenoCard3D.prototype.loadAssets = function() {
		this.loadTextures();
		return this.loadGeometries();
	};
	XenoCard3D.prototype.loadGeometries = function() {
		var self = this;
		return this.loadModels()
		.then(function(res) {
			// Card
				var bodyGeo = res[0].children[0].geometry;
				var faceGeo = res[1].children[0].geometry;
				var textGeo = res[2].children[0].geometry;
				var scale = self.computeCardGeometryScale(bodyGeo);
				var offset = XenoCard3D.GEOMETRY_OFFSET;
				bodyGeo.scale(scale, scale, scale).translate(offset.x, offset.y, offset.z);
				faceGeo.scale(scale, scale, scale).translate(offset.x, offset.y, offset.z);
				textGeo.scale(scale, scale, scale).translate(offset.x, offset.y, offset.z);
				var portraitGeo = self.generatePortraitGeometry(faceGeo);
			// Icons
				// Profile
					var profileShape = getProfileShape();
					var profileGeo = profileShape.createGeometry(getSpacedPointsWithCorners(profileShape, 1));
					profileGeo.rotateX(90 * Math.PI / 180);
					profileGeo.rotateZ(90 * Math.PI / 180);
				// Cost
					var costShape = getDiscShape(16);
					var costOutlineGeo = costShape.createGeometry(getSpacedPointsWithCorners(costShape, 16));
					var costGeo = extrudeProfileOnPath(profileGeo.vertices, costOutlineGeo.vertices);
				// Attack
					var attackShape = getDiscShape(14);
					var attackOutlineGeo = attackShape.createGeometry(getSpacedPointsWithCorners(attackShape, 16));
					var attackGeo = extrudeProfileOnPath(profileGeo.vertices, attackOutlineGeo.vertices);
				// HP
					var healthScale = 13 / 20;
					var healthShape = getShieldShape();
					var healthOutlineGeo = healthShape.createGeometry(getSpacedPointsWithCorners(healthShape, 16));
					healthOutlineGeo.scale(healthScale, healthScale, healthScale);
					var healthGeo = extrudeProfileOnPath(profileGeo.vertices, healthOutlineGeo.vertices);
			return {
				body: bodyGeo,
				face: faceGeo,
				text: textGeo,
				portrait: portraitGeo,
				costIcon: costGeo,
				attackIcon: attackGeo,
				healthIcon: healthGeo,
			};
		});
	};
	XenoCard3D.prototype.loadTextures = function() {
		this.textures = {
			body: this.textureLoader.load(XenoCard3D.TEXTURE_BODY_URL),
			face: this.textureLoader.load(XenoCard3D.TEXTURE_FACE_URL),
			text: this.textureLoader.load(XenoCard3D.TEXTURE_TEXT_URL),
			costIcon: this.textureLoader.load(XenoCard3D.TEXTURE_COSTICON_URL),
			attackIcon: this.textureLoader.load(XenoCard3D.TEXTURE_ATTACKICON_URL),
			healthIcon: this.textureLoader.load(XenoCard3D.TEXTURE_HEALTHICON_URL),
		};
		return this.textures;
	};
	XenoCard3D.prototype.computeCardGeometryScale = function(geometry) {
		geometry.computeBoundingBox();
		var bounds = geometry.boundingBox;
		var w = bounds.max.x - bounds.min.x;
		var h = bounds.max.y - bounds.min.y;
		var scale = Math.max(XenoCard3D.CARD_WIDTH / w, XenoCard3D.CARD_HEIGHT / h) * XenoCard3D.GEOMETRY_SCALE;
		return scale;
	};
	XenoCard3D.prototype.loadModels = function() {
		var loader = this.objLoader;
		function loader_onProgress(e) {
			//console.log('loader.onProgress');
			//console.log(e.currentTarget.responseURL, e.loaded, e.total);
		}
		function loader_onError(e) {
			console.log('loader.loader_onError');
			console.log(e);
		}
		function loadModel(url) {
			if(typeof onProgress !== 'function') onProgress = function(){};
			return new Promise(function(resolve, reject) {
				loader.load(url, resolve, loader_onProgress, loader_onError);
			});
		}
		return Promise.all([
			XenoCard3D.MODEL_BODY_URL,
			XenoCard3D.MODEL_FACE_URL,
			XenoCard3D.MODEL_TEXT_URL
		].map(loadModel))
		.catch(loader_onError);
	};
	XenoCard3D.prototype.generatePortraitGeometry = function(faceGeometry) {
		var portGeo = faceGeometry.toGeometry();
		var minZ = 1, maxZ = 4;
		var portScale = XenoCard3D.PORTRAIT_SCALE;
		var portX = 0 / portScale;
		var portY = -11.8 / portScale;
		var portW = 336 * portScale;
		var portH = 460 * portScale;
		var verts = portGeo.vertices;
		var faces = portGeo.faces;
		portGeo.vertices = [];
		portGeo.faces = [];
		portGeo.faceVertexUvs = [[]];
		var uvs = portGeo.faceVertexUvs[0];
		faces
		.forEach(function(f) {
			var a = verts[f.a];
			var b = verts[f.b];
			var c = verts[f.c];
			if(!((a.z > maxZ) || (b.z > maxZ) || (c.z > maxZ) || (a.z < minZ) || (b.z < minZ) || (c.z < minZ))) {
				portGeo.vertices.push(a);
				portGeo.vertices.push(b);
				portGeo.vertices.push(c);
				var len = portGeo.vertices.length;
				portGeo.faces.push(new THREE.Face3(len - 3, len - 2, len - 1));
				uvs.push([
					new THREE.Vector2((a.x + portX) / portW + 0.5, (a.y + portY) / portH + 0.5),
					new THREE.Vector2((b.x + portX) / portW + 0.5, (b.y + portY) / portH + 0.5),
					new THREE.Vector2((c.x + portX) / portW + 0.5, (c.y + portY) / portH + 0.5),
				]);
			}
		});
		portGeo.computeFaceNormals();
		portGeo.uvsNeedUpdate = true;
		return portGeo;
	};


	if(typeof module !== 'undefined' && ('exports' in module)){
		module.exports = XenoCard3D;
	}
})();