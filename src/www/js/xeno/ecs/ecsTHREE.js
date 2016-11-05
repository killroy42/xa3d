(() => {

const {Entity, System, EntityManager, createComponent} = require('XenoECS');
const XenoRuntime = require('XenoRuntime');
const MouseHandler = require('MouseHandler');
const MouseCursor = require('MouseCursor');
const THREE = require('THREE');
const {Vector3, Object3D} = THREE;
const {
	colors, dimensions,
} = require('assetdata');

const Transform = createComponent('Transform', Object3D, {
	OnAttachComponent: function(entity) {
		const {entities} = this;
		const scene = entities.findComponent(Scene);
		Object3D.call(this);
		//console.error('Transform > scene.add', scene, scene.add);
		scene.add(this);
	}
});
const Scene = createComponent('Scene', THREE.Scene, {});

const Renderer = createComponent('Renderer', THREE.WebGLRenderer, {
	OnAttachComponent(entity) {
		THREE.WebGLRenderer.call(this, {antialias: true, alpha: true});
		this.setClearColor(0x000000, 0);
		this.setPixelRatio(window.devicePixelRatio);
		this.setSize(window.innerWidth, window.innerHeight);
		this.shadowMap.enabled = true;
		this.shadowMap.type = THREE.PCFSoftShadowMap;
		this.domElement.tabIndex = -1;
		this.domElement.style.position = 'relative';
	}
});

const Camera = createComponent('Camera', THREE.PerspectiveCamera, {
	OnAttachComponent(entity) {
		THREE.PerspectiveCamera.call(this, 
			50,
			window.innerWidth / window.innerHeight,
			1, 2000
		);
		this.position.set(0, 0, 100);
		this.up = new Vector3(0, 1, 0);
		this.lookAt(new Vector3(0, 0, 0));
	}
});

class Runtime extends XenoRuntime {
	OnAttachComponent(entity) {
		const renderer = entity.requireComponent(Renderer);
		const scene = entity.requireComponent(Scene);
		const camera = entity.requireComponent(Camera);
		this.init({renderer, scene, camera});
		setTimeout(() => entity.dispatchEvent('ready', this), 0);
	}
}

const MouseEvents = createComponent('MouseEvents', MouseHandler, {
	OnAttachComponent(entity) {
		const {entities} = this;
		const scene = entities.findComponent(Scene);
		const camera = entities.findComponent(Camera);
		const {domElement} = entities.findComponent(Renderer);
		MouseHandler.call(this, {domElement, camera, scene});
	}
});
const Cursor = createComponent('Cursor', MouseCursor, {
	OnAttachComponent(entity) {
		const {entities} = this;
		const scene = entities.findComponent(Scene);
		const mouseEvents = entity.requireComponent(MouseEvents);
		MouseCursor.call(this, {scene});
		this.attach(mouseEvents);
		this.cursor.scale.set(0.02, 0.02, 0.02);
	}
});

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		Transform,
		Scene,
		Renderer,
		Camera,
		Runtime,
		MouseEvents,
		Cursor,
	};
	module.exports.ecsTHREE = module.exports;
}
})();