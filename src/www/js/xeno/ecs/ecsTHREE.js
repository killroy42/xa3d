(() => {

const {Entity, System, EntityManager, createComponent, makeComponent} = require('XenoECS');
const XenoRuntime = require('XenoRuntime');
const MouseHandler = require('MouseHandler');
const MouseCursor = require('MouseCursor');
const THREE = require('THREE');
const {
	Vector3, Box3, Object3D,
	BoxGeometry, MeshBasicMaterial, Mesh,
	OrbitControls, TransformControls,
	BufferGeometry, TextGeometry, MeshPhongMaterial,
} = THREE;
const {
	colors, dimensions,
} = require('assetdata');

class Transform extends makeComponent(THREE.Object3D) {
	OnAttachComponent(entity) {
		THREE.Object3D.call(this);
		const {entities} = this;
		const scene = entities.findComponent(Scene);
		scene.add(this);
	}
	OnDetachComponent(entity) {
		if(this.parent) this.parent.remove(this);
	}
	fromJSON({
		position = {x: 0, y: 0, z: 0},
		rotation = {x: 0, y: 0, z: 0},
		scale = {x: 1, y: 1, z: 1}
	} = {}) {
		this.position.set(position.x, position.y, position.z);
		this.rotation.set(rotation.x, rotation.y, rotation.z, rotation.order);
		this.scale.set(scale.x, scale.y, scale.z);
		return this;
	}
	toJSON() {
		const {rotation: r} = this;
		return {
			position: Object.assign({}, this.position),
			rotation: {x: r.x, y: r.y, z: r.z, order: r.order},
			scale: Object.assign({}, this.scale),
		};
	}
}

class Scene extends makeComponent(THREE.Scene) {
	OnAttachComponent(entity) {
		super.OnAttachComponent(entity);
		window.scene = this;
	}
}

class Renderer extends makeComponent(THREE.WebGLRenderer) {
	OnAttachComponent(entity) {
		THREE.WebGLRenderer.call(this, {antialias: true, alpha: true});
		this.setClearColor(0x000000, 0);
		this.setPixelRatio(window.devicePixelRatio);
		this.setSize(window.innerWidth, window.innerHeight);
		//this.shadowMap.enabled = true;
		//this.shadowMap.type = THREE.PCFSoftShadowMap;
		this.domElement.tabIndex = -1;
		this.domElement.style.position = 'relative';
	}
}

class Camera extends makeComponent(THREE.PerspectiveCamera) {
	OnAttachComponent(entity) {
		THREE.PerspectiveCamera.call(this, 
			50,
			window.innerWidth / window.innerHeight,
			0.1, 2000
		);
		this.position.set(0, 0, 100);
		this.up = new Vector3(0, 1, 0);
		this.lookAt(new Vector3(0, 0, 0));
	}
}

class Runtime extends XenoRuntime {
	OnAttachComponent(entity) {
		const renderer = entity.requireComponent(Renderer);
		const scene = entity.requireComponent(Scene);
		const camera = entity.requireComponent(Camera);
		this.init({renderer, scene, camera});
		/*
		this.on(XenoRuntime.EVENT_READY, function(event) {
			console.error('EVENT_READY');
			console.log(event);
			console.log(this);
			entity.dispatchEvent('ready', this);
		});
		setTimeout((event) => {
			console.error('setTimeout');
			console.log(event);
			console.log(this);
			//entity.dispatchEvent('ready', this);
		}, 0);
		*/
	}
}

class MouseEvents extends makeComponent(MouseHandler) {
	OnAttachComponent(entity) {
		const {entities} = this;
		const scene = entities.findComponent(Scene);
		const camera = entities.findComponent(Camera);
		const {domElement} = entities.findComponent(Renderer);
		MouseHandler.call(this, {domElement, camera, scene});
	}
}

class Cursor extends makeComponent(MouseCursor) {
	OnAttachComponent(entity) {
		const {entities} = this;
		const scene = entities.findComponent(Scene);
		const mouseEvents = entity.requireComponent(MouseEvents);
		MouseCursor.call(this, {scene});
		this.attach(mouseEvents);
		this.cursor.scale.set(0.02, 0.02, 0.02);
	}
}

class MeshComponent extends makeComponent(THREE.Mesh) {
	OnAttachComponent(entity) {
		const transform = entity.requireComponent(Transform);
		transform.add(this);
	}
	OnDetachComponent(entity) {
		if(this.parent) this.parent.remove(this);
	}
	fromJSON({position, scale} = {}) {
		if(position) this.position.copy(position);
		if(scale) this.scale.copy(scale);
		return this;
	}
	toJSON() {
		return {
			position: Object.assign({}, this.position),
			scale: Object.assign({}, this.scale),
		};
	}
}

class Collider extends MeshComponent {
	constructor() {
		super();
		//this.minBounds = new Vector3(0.001, 0.001, 0.001);
		this.padding = new Vector3(0.2, 0.2, 0.2);
		this.delegatedEvents = ['mouseup'];
		this.handlers = ['mouseup'];
	}
	OnAttachComponent(entity) {
		//console.info('Collider.OnAttachComponent(entity);');
		const geometry = new BoxGeometry(1, 1, 1);
		const material = new MeshBasicMaterial({
			color: colors.Teal300,
			transparent: true,
			opacity: 0.1,
			visible: true,
		});
		Mesh.call(this, geometry, material);
		this.name = 'collider';
		this.receiveMouseEvents = true;
		super.OnAttachComponent(entity);
		const transform = entity.requireComponent(Transform);
		this.setFromMesh(transform);
		this.delegatedEvents.forEach(event => {
			this.handlers[event] = entity.delegate(event);
			this.addEventListener(event, this.handlers[event]);
		});
	}
	OnDetachComponent(entity) {
		//console.info('Collider.OnDetachComponent(entity);');
		this.delegatedEvents.forEach(event =>
			this.removeEventListener(event, this.handlers[event]));
		super.OnDetachComponent(entity);
	}
	setFromMesh(mesh) {
		const transform = this.entity.requireComponent(Transform);
		transform.remove(this);
		const bounds = new Box3().setFromObject(mesh);
		transform.add(this);
		if(bounds.isEmpty()) {
			this.position.set(0, 0, 0);
			this.scale.copy(this.padding);
		} else {
			bounds.getSize(this.scale);
			this.scale.add(this.padding);
			this.position
				.addVectors(bounds.min, bounds.max)
				.multiplyScalar(0.5)
				.sub(transform.position);
		}
	}
}

class OrbitCamComponent extends makeComponent(OrbitControls) {
	OnAttachComponent(entity) {
		const {entities} = entity;
		const renderer = entities.findComponent(Renderer);
		const camera = entities.findComponent(Camera);
		OrbitControls.call(this, camera, renderer.domElement);
		this.camera = camera;
		this.userPanSpeed = 0.1;
		this.setCamera(camera.position);
	}
	setCamera(position, target) {
		const {entity, cameraTarget, camera} = this;
		target = target || cameraTarget || new Vector3(0, 0, 0);
		camera.position.copy(position);
		camera.lookAt(target);
		camera.updateMatrix();
		camera.near = 0.1;
		this.position0.copy(position);
		this.target0.copy(target);
		this.reset();
		this.cameraTarget = target;
	}
	fromJSON({position = this.camera.position, target = this.cameraTarget}) {
		this.setCamera(position, target);
		return this;
	}
	toJSON() {
		const {camera = {}, cameraTarget} = this;
		return {
			position: Object.assign({}, camera.position),
			target: Object.assign({}, cameraTarget),
		};
	}
}

class TransformHandle extends makeComponent(TransformControls) {
	constructor() {
		super();
		this.controlInUse = false;
		this.handleControlMousedown = this.handleControlMousedown.bind(this);
		this.handleControlMouseup = this.handleControlMouseup.bind(this);
		this.handleAnimationFrame = this.handleAnimationFrame.bind(this);
	}
	OnAttachComponent(entity) {
		const {entities} = entity;
		const Scene = entities.findComponent('Scene');
		const renderer = entities.findComponent('Renderer');
		const camera = entities.findComponent('Camera');
		const _props = Object.create(null);
		Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach(key => _props[key] = this[key]);
		TransformControls.call(this, camera, renderer.domElement);
		Object.keys(this)
		.filter(key => (_props[key] !== undefined) && (_props[key] !== this[key]))
		.forEach(key => {
			this['_'+key] = this[key];
			this[key] = _props[key];
		});
		Scene.add(this);
		this.addEventListener('mouseDown', this.handleControlMousedown);
		this.addEventListener('mouseUp', this.handleControlMouseup);
	}
	handleControlMousedown(event) {
		this.controlInUse = true;
	}
	handleControlMouseup(event) {
		this.controlInUse = false;
	}
	attach(transform) {
		//console.info('TransformHandle.attach(transform);');
		if(transform === this.object) return;
		if(!this.controlInUse) {
			cancelAnimationFrame(this.rafId);
			this._attach(transform);
			this.rafId = requestAnimationFrame(this.handleAnimationFrame);
		}
	}
	detach(transform) {
		//console.info('TransformHandle.detach(transform);');
		if(transform !== undefined && transform !== this.object) return;
		if(!this.controlInUse) {
			if(this.object && this.object.entity) this.object.entity.removeEventListener('destroy', this.handleRemoveEntity);
			this._detach();
			cancelAnimationFrame(this.rafId);
		}
	}
	handleAnimationFrame(time) {
		this.update();
		this.rafId = requestAnimationFrame(this.handleAnimationFrame);
	}
}


const FontLoaderComponent = makeComponent(THREE.FontLoader);
class Text extends MeshComponent {
	constructor() {
		super();
		var _value = 'Text';
		this.text = 'Text';
		this.fontUrl = '/data/ProximaNovaCnLt_Bold.json';
		this.font = undefined;
		this.size = 1;
		this.fontStatus = 0;
		Object.defineProperties(this, {
			value: {
				get: () => _value,
				set: val => {
					_value = val;
					this.createTextGeometry();
				}
			}
		});
	}
	OnAttachComponent(entity) {
		//console.info('TextComponent.OnAttachComponent(entity);');
		entity.requireComponent(FontLoaderComponent);
		const geometry = new BufferGeometry();
		const material = new MeshPhongMaterial({
			color: 0xffffff,
			shading: THREE.FlatShading,
		});
		Mesh.call(this, geometry, material);
		this.name = 'text';
		super.OnAttachComponent(entity);
	}
	createTextGeometry() {
		//console.info('TextComponent.createTextGeometry(); fontStatus:', this.fontStatus);
		const {entity} = this;
		const fontLoader = entity.requireComponent(FontLoaderComponent);
		if(this.fontStatus === 0) {
			fontLoader.load(this.fontUrl, font => {
				this.fontStatus = 1;
				this.font = font;
				this.createTextGeometry();
			});
			return;
		}
		const geometry = new TextGeometry(this.value, {
			font: this.font,
			size: 1,
			height: 1,
			curveSegments: 0,
			bevelEnabled: false,
			bevelThickness: 0,
			bevelSize: 0,
			//material: 0,
			//extrudeMaterial: 1
		});
		geometry.rotateX(1.5 * Math.PI);
		geometry.computeBoundingBox();
		const size = geometry.boundingBox.getSize();
		const zScale = 1 / size.z;
		geometry.scale(zScale, zScale, zScale);
		size.multiplyScalar(zScale);
		geometry.translate(-0.5 * size.x, 0, 0);
		geometry.computeBoundingBox();
		geometry.computeVertexNormals();
		this.geometry = geometry;
	}
	fromJSON(json) {
		super.fromJSON(json);
		if(json.value) this.value = json.value;
		return this;
	}
	toJSON() {
		const {value} = this;
		return Object.assign(super.toJSON(), {value});
	}
}


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		Transform,
		Scene,
		Renderer,
		Camera,
		Runtime,
		MouseEvents,
		Cursor,
		MeshComponent,
		Collider,
		OrbitCamComponent,
		TransformHandle,
		Text,
	};
	module.exports.ecsTHREE = module.exports;
}
})();