(function() {
const THREE = require('THREE');
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {Vector3} = THREE;
const Accelerator = require('Accelerator');


const PI2 = Math.PI * 2;
const normalizeAngle = a => ((a >= 0)?a:PI2 - (-a % PI2)) % PI2;
const calcAngularDistance = (() => {
	const m = new THREE.Matrix4();
	const v0 = new THREE.Vector3(0, 0, 1);
	return (transforma, transformb) => {
		const v1 = v0.clone().transformDirection(m.makeRotationFromQuaternion(transforma.quaternion));
		v1.y = 0;
		const v2 = v0.clone().transformDirection(m.makeRotationFromQuaternion(transformb.quaternion));
		v2.y = 0;
		let a = v0.angleTo(v1), b = v0.angleTo(v2);
		if(Math.sign(v1.x) < 0) a *= -1;
		if(Math.sign(v2.x) < 0) b *= -1;
		a = normalizeAngle(a);
		b = normalizeAngle(b);
		let d = normalizeAngle(b - a);
		if(d > Math.PI) d = -(PI2 - d);
		return d;
	};
})();

const getComponentsFromModules = modules => modules
	.map(require)
	.map(m=>(typeof m === 'function')?[m]:Object.keys(m).map(key=>m[key]))
	.reduce((arr, components)=>arr.concat(components), [])
	.filter(C=>typeof C === 'function');

const createMaterial = (color1, color2, opacity = 1) => ({
	color: color1,
	shininess: 550,
	emissive: color2,
	emissiveIntensity: 0.5,
	transparent: opacity !== 1,
	opacity: opacity,
});

const matWhite = createMaterial(0xffffff, 0xffffff);
const matGold = createMaterial(0xf5d061, 0xe6af2e);
const matMarkerRed = createMaterial(0xd50000, 0xFF3D00, 0.5);
const matMarkerGreen = createMaterial(0xCCFF90, 0xc6ff00, 0.5);
const matBlue = createMaterial(0x00838f, 0x1976d2);


const createKeydownHandler = camera => {
	const distance = 3;
	const deltaUp = new Vector3(0, 0, 1);
	const deltaDown = new Vector3(0, 0, -1);
	const deltaLeft = new Vector3(1, 0, 0);
	const deltaRight = new Vector3(-1, 0, 0);
	let delta = new Vector3();
	return event => {
		let zoom = camera.zoom;
		switch(event.code) {
			case 'KeyW': case 'ArrowUp': delta.copy(deltaUp); break;
			case 'KeyS': case 'ArrowDown': delta.copy(deltaDown); break;
			case 'KeyA': case 'ArrowLeft': delta.copy(deltaLeft); break;
			case 'KeyD': case 'ArrowRight': delta.copy(deltaRight); break;
			case 'NumpadAdd': zoom++; break;
			case 'NumpadSubtract': zoom--; break;
			case 'Digit0': if(event.ctrlKey) zoom = 0; break;
			default: console.log('Unhandled key code:', event.code); return;
		}
		delta.multiplyScalar(distance);
		camera.slideCamera(delta.add(camera.target), zoom);
	};
};

const createMarkerJson = color => ({
	Transform: {position: {x: 0, y: 0, z: 0}},
	Node: {children: [
		{
			Transform: {position: {x: 0, y: 0.1, z: 0}, scale: {x: 0.1, y: 0.1, z: 0.1}, rotation: {x: 0.25 * Math.PI, y: 0.25 * Math.PI, z: 0}},
			PhongMaterial: color,
			BoxGeometryComponent: {},
			GenericMeshComponent: {}
		},
	]}
});

class InputHandler {
	constructor() {
	}
	OnAttachComponent(entity) {
		const entities = entity.entities;
		const {floor} = entities.findComponent('Environment');
		const camera = entities.findComponent('CameraController');
		const node = entity.requireComponent('Node');
		const viewMarker = this.viewMarker = this.addMarker(matMarkerGreen);
		const moveMarker = this.moveMarker = this.addMarker(matMarkerRed);
		const createMouseupHandler = event => {
			const target = event.intersection.point;
			if(event.button === 0) {
				viewMarker.transform.position.copy(target);
				camera.slideCamera(target, camera.zoom);
			} else if(event.button === 2) {
				moveMarker.transform.position.copy(target);
			}
		};
		const createWheelHandler = event => {
			camera.slideCamera(camera.nextTarget, camera.zoom + Math.sign(event.deltaY));
		};
		floor.addEventListener('mouseup', createMouseupHandler);
		window.addEventListener('wheel', createWheelHandler);
		window.addEventListener('keydown', createKeydownHandler(camera));
	}
	addMarker(color) {
		const node = this.entity.requireComponent('Node');
		node.attach(this.entities.createEntity(createMarkerJson(color)));
		return node.children[node.children.length - 1].entity;
	}
}

class ShipBehaviour {
	constructor() {
		this.target = undefined;
		this.moveA = 1;
		this.moveV = 3;
		this.turnA = 0.5 * Math.PI;
		this.turnV = 10 * Math.PI;
	}
	OnAttachComponent(entity) {
		const runtime = entity.entities.findComponent('Runtime');
		this._onBeforeUpdateHandler = this.createOnBeforeUpdateHandler();
		runtime.OnBeforeRender.push(this._onBeforeUpdateHandler);
	}
	setTarget(target) {
		this.target = target;
	}
	createOnBeforeUpdateHandler() {
		const transform = this.entity.getComponent('Transform');
		const targetTransform = {quaternion: new THREE.Quaternion(), m: new THREE.Matrix4()};
		const turnAccelerator = new Accelerator(this.turnA, this.turnV);
		const moveAccelerator = new Accelerator(this.moveA, this.moveV);
		const position = new Vector3(), target = new Vector3();
		const proximityTolerance = 1;
		let t0, dt;
		const handleOnBeforeUpdate = time => {
			if(t0 === undefined) { t0 = time; return; }
			dt = (time - t0) * 0.001; t0 = time;
			if(this.target !== undefined) {
				// Turning
					targetTransform.m.lookAt(this.target, transform.position, transform.up);
					targetTransform.quaternion.setFromRotationMatrix(targetTransform.m);
					const angDist = calcAngularDistance(transform, targetTransform);
					const angV = turnAccelerator.update(angDist, dt);
					const pan = transform.rotation.y + angV;
				// Moving
					position.set(transform.position.x, 0, transform.position.z);
					target.set(this.target.x, 0, this.target.z);
					const linDist = Math.max(0, position.distanceTo(target) - proximityTolerance);
					const translation = moveAccelerator.update(linDist, dt);
				transform.rotation.y = pan;
				transform.translateZ(translation);
			}
		};
		return handleOnBeforeUpdate;
	}
}

const shipJson = {
	Transform: {scale: {x: 0.3, y: 0.3, z: 0.3}},
	Node: {children: [
		{
			Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 2, z: 4}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {}
		},
		{ // front
			Transform: {position: {x: 0, y: -0.05, z: 1.9}, scale: {x: 1.0, y: 1.6, z: 1.0}, rotation: {x: 0.15 * Math.PI, y: 0, z: 0}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {}
		},
		{ // rear
			Transform: {position: {x: 0, y: 0.1, z: -2.1}, scale: {x: 1.1, y: 1.8, z: 0.4}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {}
		},
	]},
	ShipBehaviour: {}
};

const initShips = entities => {
	const inputHandler = entities.findComponent('InputHandler');

	const ship = entities.createEntity(shipJson);
	ship.transform.position.set(0, 0.2, 0);
	ship.shipBehaviour.setTarget(inputHandler.moveMarker.transform.position);

	const ship2 = entities.createEntity(shipJson);
	ship2.transform.position.set(0, 1, 0);
	ship2.shipBehaviour.setTarget(inputHandler.viewMarker.transform.position);
	//ship.transform.rotation.set(0, -0.5 * Math.PI, 0);
};

const createRuntime = () => {
	const entities = new EntityManager();
	entities.registerComponents(getComponentsFromModules(['ecsTHREE', 'ecsCore', 'Environment', 'CameraController']));
	entities.registerComponents([InputHandler, ShipBehaviour]);
	return entities.createEntity(['Runtime', 'Cursor', 'CameraController', 'Environment', 'InputHandler']).runtime;
};


const init = () => {
	const runtime = createRuntime();
	const entities = runtime.entities;
	initShips(runtime.entities);
	runtime.start();
};

document.addEventListener('DOMContentLoaded', init);

})();