// enhanceTHREE
(function () {
	
	function Vector2_toString() {
		return 'V2{'+
			'x:'+this.x.toFixed(1)+','+
			'y:'+this.y.toFixed(1)+'}';
	}
	
	function Vector3_toString() {
		return 'V3{'+
			'x:'+this.x.toFixed(1)+','+
			'y:'+this.y.toFixed(1)+','+
			'z:'+this.z.toFixed(1)+'}';
	}

	function Euler_toString() {
		return 'Euler{'+
			'x:'+this.x.toFixed(1)+','+
			'y:'+this.y.toFixed(1)+','+
			'z:'+this.z.toFixed(1)+'}';
	}


	function BufferGeometry_toGeometry() {
		var attrib = this.getAttribute('position');
		var positions = attrib.array;
		var vertices = [];
		var faces = [], i, n;
		if(attrib === undefined) {
			throw new Error('a given BufferGeometry object must have a position attribute.');
		}
		for(i = 0, n = positions.length; i < n; i += 3) {
			var x = positions[i];
			var y = positions[i + 1];
			var z = positions[i + 2];
			vertices.push(new THREE.Vector3(x, y, z));
		}
		for(i = 0, n = vertices.length; i < n; i += 3) {
			faces.push(new THREE.Face3(i, i + 1, i + 2));
		}
		var geometry = new THREE.Geometry();
		geometry.vertices = vertices;
		geometry.faces = faces;
		geometry.computeFaceNormals();
		return geometry;
	}

	function enhanceTHREE(THREE) {
		THREE.Vector2.prototype.toString = Vector2_toString;
		THREE.Vector3.prototype.toString = Vector3_toString;
		THREE.Euler.prototype.toString = Euler_toString;
		THREE.Euler.prototype.toString = Euler_toString;
		THREE.BufferGeometry.prototype.toGeometry = BufferGeometry_toGeometry;
		return THREE;
	}
	
	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = enhanceTHREE;
	}
})();

// THREE.Prototype
(function () {
	var THREE = require('THREE');

	function Prototype(opts) {
		opts = opts || {};
		THREE.Cache.enabled = true;
		this.windowElement = opts.window || window;
		this.cssBackground = opts.background || '#000';
		this.fov = opts.fov || 50;
		this.initialized = false;
		this.cache = {};
	}
	Prototype.PATH_SHADER = '/shaders/';
	Prototype.EXT_SHADER = '.glsl';
	Prototype.prototype.handleError = function Prototype_onGenericError(err) {
		console.error('Error:', err);
		throw err;
	};
	Prototype.prototype.getRootElement = function() {
		var head = document.head;
		var headStyleTags = head.getElementsByTagName('style');
		var styleTag = document.createElement('style');
		styleTag.type = 'text/css';
		if(headStyleTags.length > 0) {
			head.insertBefore(styleTag, headStyleTags[0]);
		} else {
			head.appendChild(styleTag);
		}
		return document.body;
	};
	Prototype.prototype.createRenderer = function() {
		var window = this.windowElement;
		var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
		//var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, logarithmicDepthBuffer: true});
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(0x000000, 0);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.domElement.tabIndex = -1;
		return renderer;
	};
	Prototype.prototype.createScene = function() {
		var scene = new THREE.Scene();
		return scene;
	};
	Prototype.prototype.createCamera = function() {
		var camera = new THREE.PerspectiveCamera(
			this.fov,
			this.windowElement.innerWidth / this.windowElement.innerHeight,
			10, 2000
		);
		camera.position.set(0, 0, 1000);
		camera.up = new THREE.Vector3(0, 1, 0);
		camera.lookAt(new THREE.Vector3(0, 0, 0));
		return camera;
	};
	Prototype.prototype.createControls = function() {
		if(THREE.OrbitControls === undefined) return;
		var controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
		controls.userPanSpeed = 0.1;
		this.setCamera(this.camera.position, this.cameraTarget);
		return controls;
	};
	Prototype.prototype.createTextureLoader = function() {
		var textureLoader = new THREE.TextureLoader();
		textureLoader.crossOrigin = 'Anonymous';
		return textureLoader;
	};
	Prototype.prototype.handleWindowResize = function() {
		var window = this.windowElement;
		var camera = this.camera;
		var renderer = this.renderer;
		var width = window.innerWidth, height = window.innerHeight;
		renderer.setSize(width, height, true);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};
	Prototype.prototype.handleContextMenu = function(e) {
		e.preventDefault();
	};
	Prototype.prototype.init = function() {
		if(this.initialized) return;
		this.initialized = true;
		this.rootElement = this.getRootElement();
		this.renderer = this.createRenderer();
		this.rootElement.appendChild(this.renderer.domElement);
		this.scene = this.createScene();
		this.camera = this.createCamera();
		this.controls = this.createControls();
		this.textureLoader = this.createTextureLoader();
		if(typeof this.oninit === 'function') this.oninit();
	};
	Prototype.prototype.start = function() {
		var self = this;
		var boundResizeHandler = function(e) { return self.handleWindowResize(e); };
		var boundContextMenuHandler = function(e) { return self.handleContextMenu(e); };
		var renderer, scene, camera, windowElement, rafId, frameTime;
		function update() {
			if(self.onupdate) self.onupdate(frameTime);
			rafId = windowElement.requestAnimationFrame(renderFrame);
		}
		function renderFrame(time) {
			frameTime = time;
			if(self.onrender) self.onrender(frameTime);
			renderer.render(scene, camera);
			setTimeout(update, 0);
		}
		function stop() {
			windowElement.removeEventListener('resize', boundResizeHandler);
			windowElement.removeEventListener('contextmenu', boundContextMenuHandler);
			self.stop = Prototype.prototype.stop;
			windowElement.cancelAnimationFrame(rafId);
		}
		function start() {
			self.stop = stop;
			windowElement.addEventListener('resize', boundResizeHandler);
			windowElement.addEventListener('contextmenu', boundContextMenuHandler);
			rafId = windowElement.requestAnimationFrame(renderFrame);
		}
		this.init();
		renderer = this.renderer;
		scene = this.scene;
		camera = this.camera;
		windowElement = this.windowElement;
		start();
	};
	Prototype.prototype.stop = function() {
		console.warn('Currently not animating.');
	};
	Prototype.prototype.loadTexture = function(url) {
		var self = this;
		var boundErrorHandler = function(err) { return this.handleError(err); };
		var resolverFunc;
		var texture = this.textureLoader.load(url, function() { resolverFunc(); }, undefined, boundErrorHandler);
		//texture.minFilter = THREE.LinearFilter;
		texture.promise = new Promise(function(resolve, reject) { resolverFunc = resolve; });
		texture.anisotropy = this.renderer.getMaxAnisotropy();
		return texture;
	};
	Prototype.prototype.getLoadTexture = function() {
		var self = this;
		return function(url) { return self.loadTexture(url); };
	};
	Prototype.prototype.loadShader = function(name) {
		var url = Prototype.PATH_SHADER + name + Prototype.EXT_SHADER;
		//console.info('Prototype.loadShader("%s");', url);
		if(this.cache[url] === undefined) {
			this.cache[url] = fetch(url).then(function(res) { return res.text(); });
		}
		return this.cache[url];
	};
	Prototype.prototype.getLoadShader = function() {
		var self = this;
		return function(name) { return self.loadShader(name); };
	};
	Prototype.prototype.setCamera = function(position, target) {
		var camera = this.camera;
		this.cameraTarget = target || new THREE.Vector3(0, 0, 0);
		camera.position.copy(position);
		camera.lookAt(this.cameraTarget);
		camera.updateMatrix();
		var controls = this.controls;
		if(controls === undefined) return;
		if(controls.position0) controls.position0.copy(camera.position);
		if(controls.target0) controls.target0.copy(this.cameraTarget);
		if(controls.reset) controls.reset();
	};

	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = {};
		module.exports.THREEPrototype = Prototype;
	}
})();