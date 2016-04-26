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

	function enhanceTHREE(THREE) {
		THREE.Vector2.prototype.toString = Vector2_toString;
		THREE.Vector3.prototype.toString = Vector3_toString;
		THREE.Euler.prototype.toString = Euler_toString;
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
	}
	Prototype.HTML_CSS = 'height: 100%;';
	Prototype.BODY_CSS = 'height: 100%; margin: 0; overflow: hidden;';
	Prototype.prototype.handleError = function Prototype_onGenericError(err) {
		console.error('Error:', err);
		throw err;
	};
	Prototype.prototype.getRootElement = function() {
		document.documentElement.style.cssText = Prototype.HTML_CSS;
		document.body.style.cssText = Prototype.BODY_CSS+
			'background: '+this.cssBackground+';';
		return document.body;
	};
	Prototype.prototype.createRenderer = function() {
		var window = this.windowElement;
		var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
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
		var camera = new THREE.PerspectiveCamera(this.fov, this.windowElement.innerWidth / this.windowElement.innerHeight, 1, 10000);
		camera.position.set(0, 0, 1000);
		camera.up = new THREE.Vector3(0, 1, 0);
		camera.lookAt(new THREE.Vector3(0, 0, 0));
		return camera;
	};
	Prototype.prototype.createControls = function() {
		var controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
		controls.userPanSpeed = 0.1;
		controls.target0.copy(new THREE.Vector3(0, 0, 0));
		controls.reset();
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
		renderer.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
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
		var boundResizeHandler = function() { return self.handleWindowResize(); };
		var renderer, scene, camera, window, rafId;
		function renderFrame() {
			rafId = window.requestAnimationFrame(renderFrame);
			renderer.render(scene, camera);
		}
		function stop() {
			window.removeEventListener('resize', boundResizeHandler);
			self.stop = Prototype.prototype.stop;
			window.cancelAnimationFrame(rafId);
		}
		function start() {
			self.stop = stop;
			window.addEventListener('resize', boundResizeHandler);
			rafId = window.requestAnimationFrame(renderFrame);
		}
		
		this.init();
		renderer = this.renderer;
		scene = this.scene;
		camera = this.camera;
		window = this.windowElement;
		start();
	};
	Prototype.prototype.stop = function() {
		console.warn('Currently not animating.');
	};
	Prototype.prototype.loadTexture = function(url) {
		var self = this;
		var boundErrorHandler = function(err) { return this.handleError(err); };
		return this.textureLoader.load(url, undefined, undefined, boundErrorHandler);
	};
	Prototype.prototype.getLoadTexture = function() {
		var self = this;
		return function(url) {
			return self.loadTexture(url);
		};
	};

	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = {};
		module.exports.THREEPrototype = Prototype;
	}
})();