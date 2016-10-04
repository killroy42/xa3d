(() => {

const EventDispatcher = require('EventDispatcher');
const {
	Vector3, Matrix4, Quaternion, Box3,
	Object3D,
	MeshBasicMaterial,
	BoxGeometry,
	Mesh,
	BoxHelper,
} = require('THREE');
const {Entity, Component, System, EntityManager} = require('XenoECS');
const {colors} = require('assetdata');

class SceneComponent extends Component {
	constructor() {
		super();
		this._object3d = undefined;
		Object.defineProperties(this, {
			name: {get: () => this._object3d.name, set: (val) => this._object3d.name = val},
			position: {get: () => this._object3d.position},
			scale: {get: () => this._object3d.scale},
			rotation: {get: () => this._object3d.rotation},
			quaternion: {get: () => this._object3d.quaternion},
			children: {get: () => this._object3d.children},
			add: {value: (...args) => this._object3d.add(...args)},
			remove: {value: (...args) => this._object3d.remove(...args)},
			worldToLocal: {value: (...args) => this._object3d.worldToLocal(...args)},
			getObjectByName: {value: (...args) => this._object3d.getObjectByName(...args)},
			updateMatrix: {value: (...args) => this._object3d.updateMatrix(...args)},
			updateMatrixWorld: {value: (...args) => this._object3d.updateMatrixWorld(...args)},
			object3d: {get: () => this._object3d},
			visible: {get: () => this._object3d.visible, set: (val) => this._object3d.visible = val},
			receiveMouseEvents: {get: () => this._object3d.receiveMouseEvents, set: (val) => this._object3d.receiveMouseEvents = val},
			childrenReceiveMouseEvents: {get: () => this._object3d.childrenReceiveMouseEvents, set: (val) => this._object3d.childrenReceiveMouseEvents = val},
		});
	}
	OnCreateMesh() {
		const object3d = new Object3D();
		object3d.name = this.constructor.name;
		object3d.userData.entity = this.getEntity();
		object3d.childrenReceiveMouseEvents = true;
		return object3d;
	}
	OnDestroyMesh() {
	}
	OnAttachComponent(entity) {
		const {transform} = this._entity;
		this._object3d = this.OnCreateMesh();
		transform.add(this._object3d);
	}
	OnDetachComponent(entity) {
		const transform = this.getComponent(Transform);
		transform.remove(this._object3d);
		this.OnDestroyMesh();
		this._object3d = undefined;
	}
}

class Transform extends SceneComponent {
	OnAttachComponent(entity) {
		this._object3d = this.OnCreateMesh();
	}
	OnDetachComponent(entity) {
		this.object3d.remove(...this.object3d.children);
		this.object3d.parent.remove(this.object3d);
		this._object3d = undefined;
	}
	addTo(object3d) {
		object3d.add(this._object3d);
	}
	reset() {
		const {_object3d, position, rotation, scale} = this;
		_object3d.visible = true;
		position.set(0, 0, 0);
		rotation.set(0, 0, 0);
		scale.set(1, 1, 1);
		_object3d.updateMatrix();
		_object3d.updateMatrixWorld(true);
	}
}

class Collider extends SceneComponent {
	OnCreateMesh() {
		const transform = this.getComponent(Transform);
		const geo = new BoxGeometry(1, 1, 1);
		const mesh = new Mesh(geo, new MeshBasicMaterial({
			//wireframe: true,
			color: colors.Teal300,
			transparent: true,
			opacity: 0.2,
		}));
		mesh.name = transform.object3d.name+'.collider';
		mesh.userData.entity = this._entity;
		mesh.receiveMouseEvents = true;
		//this.OnUpdate(mesh);
		return mesh;
	}
	OnAttachComponent(entity) {
		super.OnAttachComponent(entity);
		//const {transform} = this._entity;
		//transform.object3d.childrenReceiveMouseEvents = true;
		this.OnUpdate();
	}
	OnUpdate() {
		//console.info('Collider.OnUpdate();');
		//colliderMesh = colliderMesh || this.object3d;
		const transform = this.getComponent(Transform);
		//const position = new Vector3();
		//const quaternion = new Quaternion();
		//const scale = new Vector3();
		//transform.object3d.matrixWorld.decompose(position, quaternion, scale);
		//console.log('p:', position);
		//console.log('q:', quaternion);
		//console.log('s:', scale);
		/*
		const tm = transform.object3d.matrix.clone();
		transform.object3d.matrix.identity();
		transform.object3d.applyMatrix(new Matrix4().identity());
		transform.remove(colliderMesh);
		const bounds = new Box3().setFromObject(transform.object3d);
		const size = bounds.getSize();
		size.x = Math.max(size.x, 0.001);
		size.y = Math.max(size.y, 0.001);
		size.z = Math.max(size.z, 0.001);
		colliderMesh.scale.copy(size);
		colliderMesh.position.copy(bounds.getCenter());
		*/

		//transform.add(colliderMesh);
		//transform.object3d.applyMatrix(tm);
	}
}

class ControlView extends SceneComponent {
	constructor() {
		super();
		this.handleMouseenter = this.handleMouseenter.bind(this);
		this.handleMouseleave = this.handleMouseleave.bind(this);
		this.handleMousemove = this.handleMousemove.bind(this);
		this._isHovering = false;
		this._hoverOpacity = 0.7;
		this._unhoverOpacity = 0.4;
	}
	OnCreateMesh() {
		const transform = this.getComponent(Transform);
		const mesh = new BoxHelper(transform.object3d);
		mesh.material.transparent = true;
		mesh.material.opacity = this._unhoverOpacity;
		mesh.material.depthTest = false;
		mesh.material.depthWrite = false;
		return mesh;
	}
	OnUpdate() {
		//console.info('ControlView.OnUpdate();');
		const transform = this.getComponent(Transform);
		const collider = this.getComponent(Collider);
		collider.object3d.geometry.computeBoundingBox();
		this.object3d.update(collider.object3d.geometry.boundingBox);
		this.object3d.scale.copy(collider.scale);
	}
	OnAttachComponent(entity) {
		//console.info('ControlView.OnAttachComponent(entity);');
		super.OnAttachComponent(entity);
		const {object3d} = this.getComponent(Collider);
		object3d.scale.copy(ControlView.DEFAULT_SIZE);
		object3d.addEventListener('mouseenter', this.handleMouseenter);
	}
	OnDetachComponent(entity) {
		//console.info('ControlView.OnDetachComponent(entity);');
		super.OnDetachComponent(entity);
		const {object3d} = this.getComponent(Collider);
		this.stopListening();
		object3d.removeEventListener('mouseenter', this.handleMouseenter);
	}
	startListening() {
		const {object3d} = this.getComponent(Collider);
		const keyHandler = this.getManager().findComponent('KeyHandler');
		object3d.addEventListener('mouseleave', this.handleMouseleave);
		object3d.addEventListener('mousemove', this.handleMousemove);
		keyHandler.addEventListener('keydown', this.handleMousemove);
		keyHandler.addEventListener('keyup', this.handleMousemove);
	}
	stopListening() {
		const {object3d} = this.getComponent(Collider);
		const keyHandler = this.getManager().findComponent('KeyHandler');
		object3d.removeEventListener('mouseleave', this.handleMouseleave);
		object3d.removeEventListener('mousemove', this.handleMousemove);
		keyHandler.removeEventListener('keydown', this.handleMousemove);
		keyHandler.removeEventListener('keyup', this.handleMousemove);
	}
	handleMouseenter(event) {
		//console.info('ControlView.handleMouseenter(event);');
		const {object3d} = this.getComponent(Collider);
		object3d.removeEventListener('mouseenter', this.handleMouseenter);
		this.startListening();
		this._isHovering = true;
		this.object3d.material.opacity = this._hoverOpacity;
		this.handleMousemove(event);
	}
	handleMouseleave(event) {
		//console.info('ControlView.handleMouseleave(event);');
		const {object3d} = this.getComponent(Collider);
		object3d.addEventListener('mouseenter', this.handleMouseenter);
		this.stopListening();
		this._isHovering = false;
		this.object3d.material.opacity = this._unhoverOpacity;
		this.handleMousemove(event);
	}
	handleMousemove(event) {
		//console.log(event.originalEvent.shiftKey);
		this.object3d.material.color.set(ControlView.DDEFAULT_COLOR);
		const keyHandler = this.getManager().findComponent('KeyHandler');
		if(this._isHovering && keyHandler.isPressed('Shift')) {
			this.object3d.material.color.set(ControlView.DELETE_COLOR);
		}
	}
}
ControlView.DEFAULT_SIZE = new Vector3(1, 0.1, 1);
ControlView.DDEFAULT_COLOR = 0xffff00;
ControlView.DELETE_COLOR = 0xff0000;

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		Transform,
		SceneComponent,
		Collider,
		ControlView,
	};
	module.exports.components = module.exports;
}
})();