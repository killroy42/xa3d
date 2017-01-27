((window, module, require) => {
const {
	WebGLRenderer, Scene, PerspectiveCamera,
	Vector3, PCFSoftShadowMap,
} = require('enhanceTHREE')(require('THREE'));
const EventDispatcher = require('EventDispatcher');


const DEFAULT_OPTS = {
	window,
	domElement: window.document.body,
	clearColor: 0x000000,
	renderOpts: {antialias: true, alpha: true},
	cameraOpts: {fov: 50},
};

class XenoRuntime {
	constructor(opts = DEFAULT_OPTS) {
		const {window, domElement, clearColor, renderOpts, cameraOpts} = opts;
		EventDispatcher.apply(this);
		this.handleWindowResize = this.handleWindowResize.bind(this);
		this.handleContextMenu = this.handleContextMenu.bind(this);
		this.handleUpdate = this.handleUpdate.bind(this);
		this.handleAnimationFrame = this.handleAnimationFrame.bind(this);
		this.initialized = false;
		this.window = window;
		this.domElement = domElement;
		this.renderOpts = renderOpts;
		this.cameraOpts = cameraOpts;
		this.clearColor = clearColor;
		this.renderer = undefined;
		this.scene = undefined;
		this.camera = undefined;
		this.rafId = undefined;
		this.updateTimoutId = undefined;
		this.OnBeforeRender = [];
	}
	__createRenderer() {
		const {window, renderOpts, clearColor} = this;
		const renderer = new WebGLRenderer(renderOpts);
		//renderer.setClearColor(clearColor, 0);
		//renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setPixelRatio(1);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = PCFSoftShadowMap;
		renderer.domElement.tabIndex = -1;
		renderer.domElement.style.position = 'relative';
		return renderer;
	}
	createScene() { return new Scene(); }
	createCamera() {
		const {window, cameraOpts: {fov}} = this;
		const camera = new PerspectiveCamera(
			fov,
			window.innerWidth / window.innerHeight,
			1, 2000
		);
		camera.position.set(0, 0, 100);
		camera.up = new Vector3(0, 1, 0);
		camera.lookAt(new Vector3(0, 0, 0));
		return camera;
	}
	init({scene, camera, renderer} = {}) {
		const {initialized, domElement} = this;
		if(initialized) return;
		//console.info('XenoRuntime.init();');
		this.initialized = true;
		this.renderer = renderer;// || this.createRenderer();
		this.scene = scene || this.createScene();
		this.camera = camera || this.createCamera();
		domElement.appendChild(this.renderer.domElement);
		this.emit(XenoRuntime.EVENT_READY);
	}
	handleWindowResize() {
		const {window: {innerWidth: width, innerHeight: height}, camera, renderer} = this;
		//console.log('XenoRuntime.handleWindowResize:', width, height);
		renderer.setSize(width, height, true);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}
	handleContextMenu(event) {
		event.preventDefault();
	}
	handleUpdate(time) {
		const {window: {requestAnimationFrame}, handleAnimationFrame} = this;
		this.rafId = requestAnimationFrame(handleAnimationFrame);
	}
	handleAnimationFrame(time) {
		const {
			renderer, scene, camera,
			window: {setImmediate}, handleUpdate,
		} = this;
		this.renderTime = time;
		this.updateTimoutId = setTimeout(handleUpdate, 0);
		for(var i = 0; i < this.OnBeforeRender.length; i++) {
			this.OnBeforeRender[i](time);
		} 
		renderer.render(scene, camera);
	}
	createAnimationFrameHandler() {
		const {renderer, scene, camera, OnBeforeRender} = this;
		const handleAnimationFrame = time => {
			this.renderTime = time;
			requestAnimationFrame(handleAnimationFrame);
			for(var i = 0; i < OnBeforeRender.length; i++) OnBeforeRender[i](time);
			renderer.render(scene, camera);
		};
		return handleAnimationFrame;
	}
	start() {
		//console.info('XenoRuntime.start();');
		const {window, window: {requestAnimationFrame}} = this;
		this.init();
		window.addEventListener('resize', this.handleWindowResize);
		window.addEventListener('contextmenu', this.handleContextMenu);
		this.rafId = requestAnimationFrame(this.createAnimationFrameHandler());
	}
}
XenoRuntime.DEFAULT_OPTS = DEFAULT_OPTS;
XenoRuntime.EVENT_READY = 'runtimeReady';

module.exports = XenoRuntime;

})(this, module, require);