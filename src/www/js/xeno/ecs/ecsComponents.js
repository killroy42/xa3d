(() => {
/* jshint validthis: true */
'use strict';

const {
	Box3,
	Object3D,
	MeshBasicMaterial,
	BoxGeometry,
	Mesh,
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
			add: {value: (obj) => this._object3d.add(obj)},
			remove: {value: (obj) => this._object3d.remove(obj)},
			object3d: {get: () => this._object3d},
			visible: {get: () => this._object3d.visible, set: (val) => this._object3d.visible = val},
		});
	}
	create() {
		throw new Error('SceneComponent.create() must be overridden');
	}
	OnAttachComponent(entity) {
		const {transform} = this._entity;
		this._object3d = this.create();
		transform.add(this._object3d);
	}
	OnDetachComponent(entity) {
		const transform = this.getComponent(Transform);
		transform.remove(this._object3d);
		this._object3d = undefined;
	}
}

class Transform extends SceneComponent {
	create() {
		return new Object3D();
	}
	OnAttachComponent(entity) {
		this._object3d = this.create();
	}
	OnDetachComponent(entity) {
		this._object3d = undefined;
	}
	addTo(object3d) {
		object3d.add(this._object3d);
	}
	OnDetachComponent(entity) {
		this.object3d.remove(...this.object3d.children);
		this.object3d.parent.remove(this.object3d);
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
	create() {
		const transform = this.getComponent(Transform);
		const geo = new BoxGeometry(1, 1, 1);
		const mesh = new Mesh(geo, new MeshBasicMaterial({
			//wireframe: true,
			color: colors.Teal300,
			transparent: true,
			opacity: 0.2,
		}));
		mesh.name = transform.object3d.name+'.collider';
		mesh.receiveMouseEvents = true;
		const bounds = new Box3().setFromObject(transform.object3d);
		const size = bounds.getSize();
		size.x = Math.max(size.x, 0.01);
		size.y = Math.max(size.y, 0.01);
		size.z = Math.max(size.z, 0.01);
		mesh.scale.copy(size);
		mesh.position.copy(bounds.getCenter());
		mesh.userData.entity = this._entity;
		return mesh;
	}
	OnAttachComponent(entity) {
		super.OnAttachComponent(entity);
		const {transform} = this._entity;
		transform.object3d.childrenReceiveMouseEvents = true;
	}
}

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		Transform,
		SceneComponent,
		Collider,
	};
	module.exports.components = module.exports;
}
})();