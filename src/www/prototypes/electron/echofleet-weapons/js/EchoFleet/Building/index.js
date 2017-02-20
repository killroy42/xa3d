(function() {
const THREE = require('THREE');
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {Vector3, Matrix4, Quaternion} = THREE;
const Accelerator = require('Accelerator');


const PI = Math.PI, PI2 = PI * 2;
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

//const matWhite = createMaterial(0xffffff, 0xffffff);
const matWhite = createMaterial(0xfffffff, 0xEDE7F6);
const matGold = createMaterial(0xf5d061, 0xe6af2e);
const matMarkerRed = createMaterial(0xd50000, 0xFF3D00, 0.5);
const matMarkerGreen = createMaterial(0xCCFF90, 0xc6ff00, 0.5);
const matBlue = createMaterial(0x00838f, 0x1976d2);
const matLaserGreen = createMaterial(0x76FF03, 0xB2FF59, 0.5);
const matRocketRed = createMaterial(0xFF6D00, 0xFF6D00, 0.5);


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
			if(event.buttons & 1) {
				viewMarker.transform.position.copy(target);
				camera.slideCamera(target, camera.zoom);
			}
			if(event.buttons & 2) {
				moveMarker.transform.position.copy(target);
			}
		};
		const createWheelHandler = event => {
			camera.slideCamera(camera.nextTarget, camera.zoom + Math.sign(event.deltaY));
		};
		floor.addEventListener('mousedown', createMouseupHandler);
		floor.addEventListener('mousemove', createMouseupHandler);
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

class WeaponController {
	constructor() {
		this.target = undefined;
		this.weapon = undefined;
		this.turnA = 0.5 * Math.PI;
		this.turnV = 10 * Math.PI;
	}
	OnAttachComponent(entity) {
		const runtime = entity.entities.findComponent('Runtime');
		this._onBeforeUpdateHandler = this.createOnBeforeUpdateHandler();
		runtime.OnBeforeRender.push(this._onBeforeUpdateHandler);
	}
	setWeapon(weapon) {
		this.weapon = weapon;
		//const runtime = this.entity.entities.findComponent('Runtime');
		//this._onBeforeUpdateHandler = this.createOnBeforeUpdateHandler();
		//runtime.OnBeforeRender.push(this._onBeforeUpdateHandler);
	}
	setTarget(target) {
		this.target = target;
	}
	createOnBeforeUpdateHandler() {
		const transform = this.entity.getComponent('Transform');
		const turnAccelerator = new Accelerator(this.turnA, this.turnV);
		const targetV = new Vector3();
		const directionV = new Vector3();
		const worldPosition = new Vector3();
		const worldQuaternion = new Quaternion();
		const axis = new Vector3(0, 1, 0);
		let t0, dt;
		const calcAngularDistance = (() => {
			const cross = new Vector3();
			return (va, vb) => {
				const direction = (cross.crossVectors(va, vb).y > 0)?-1:1;
				return direction * va.angleTo(vb);
			};
		})();
		const handleOnBeforeUpdate = time => {
			if(t0 === undefined) { t0 = time; return; }
			dt = (time - t0) * 0.001; t0 = time;
			if(this.target !== undefined) {
				turnAccelerator.maxA = this.turnA;
				turnAccelerator.maxV = this.turnV;
				transform.getWorldPosition(worldPosition);
				targetV.subVectors(this.target, worldPosition);//transform.getWorldPosition(worldPosition));
				transform.getWorldQuaternion(worldQuaternion);
				directionV.set(0, 0, 1).applyQuaternion(worldQuaternion);
				targetV.y = 0;
				directionV.y = 0;
				const angDist = calcAngularDistance(targetV, directionV);
				const angV = turnAccelerator.update(angDist, dt);
				transform.rotateOnAxis(axis, angV);
			}
		};
		return handleOnBeforeUpdate;
	}
	fromJSON(json = {}) {
		//console.info('WeaponController.fromJSON(json);', this.entity.id);
		const {a, v, target} = json;
		if(a) this.turnA = a;
		if(v) this.turnV = v;
		if(target) this.setTarget(target);
	}
}

// Models
const shipAModel = {
	Transform: {scale: {x: 0.3, y: 0.3, z: 0.3}},
	Node: {children: [
		{ // Hull
			Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 2, z: 4}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		},
		{ // front
			Transform: {position: {x: 0, y: -0.05, z: 1.9}, scale: {x: 1.0, y: 1.6, z: 1.0}, rotation: {x: 0.15 * Math.PI, y: 0, z: 0}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		},
		{ // rear
			Transform: {position: {x: 0, y: 0.1, z: -2.1}, scale: {x: 1.1, y: 1.8, z: 0.4}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		},
		{ // gun placements
			Transform: {position: {x: 0, y: 0.9, z: 0}, scale: {x: 2, y: 0.4, z: 1}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		},
	]}
};

const shipBModel = {
	Transform: {scale: {x: 0.3, y: 0.3, z: 0.3}},
	Node: {children: [
		{ // hull
			Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 2, z: 4}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		},
		{ // front
			Transform: {position: {x: 0, y: -0.05, z: 1.9}, scale: {x: 1.0, y: 1.6, z: 1.0}, rotation: {x: 0.15 * Math.PI, y: 0, z: 0}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		},
		{ // rear
			Transform: {position: {x: 0, y: 0.1, z: -2.1}, scale: {x: 1.1, y: 1.8, z: 0.4}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		},
		{ // gun placements
			Transform: {position: {x: 0, y: 1.0, z: 0}, scale: {x: 0.8, y: 0.4, z: 3}},
			PhongMaterial: matBlue,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		},
	]},
};

const laserTurretModel = nozzle => ({
	Transform: {},
	Node: {children: [
		{
			Transform: {position: {x: 0, y: 0, z: 0.2}, scale: {x: 0.2, y: 0.1, z: 0.6}},
			PhongMaterial: matWhite,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		},
		{Transform: {position: {x: 0, y: 0, z: 0.5}}, Node: {children: [nozzle]}}
	]}
});
const laserNozzleModel = {
	Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}},
	Node: {children: [
		{
			Transform: {position: {x: 0, y: 0, z: 0.5}, scale: {x: 0.05, y: 0.05, z: 1}},
			PhongMaterial: matLaserGreen,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		}
	]}
};

const rocketTurretModel = nozzle => ({
	Transform: {},
	Node: {children: [
		{
			Transform: {position: {x: 0, y: 0, z: -0.05}, scale: {x: 0.24, y: 0.14, z: 0.3}},
			PhongMaterial: matWhite,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		},
		{Transform: {position: {x: 0, y: 0, z: 0.1}}, Node: {children: [nozzle]}}
	]}
});
const rocketNozzleModel = {
	Transform: {},
	Node: {children: [
		{
			Transform: {position: {x: 0, y: 0, z: 0.015}, scale: {x: 0.2, y: 0.1, z: 0.03}},
			PhongMaterial: matRocketRed,
			BoxGeometryComponent: {},
			GenericMeshComponent: {},
		}
	]}
};

const shipFramework = (model, weapons) => ({
	Transform: {position: {x: 0, y: 0.4, z: 0}},
	Node: {children: [
		model,
		{Transform: {}, Node: {children: weapons.map(({position, model, a, v}) => ({
			Transform: {position, rotation: {x: -4 * (Math.PI / 180), y: 0, z: 0}},
			Node: {children: [model]},
			WeaponController: {a, v},
		}))}}
	]},
	ShipBehaviour: {},
});

const createShipModel = (model, slots) => ({
	Transform: {},
	Node: {children: [
		model,
		{Transform: {}, Node: {children: slots.map(({x, y, z}) => ({
			Transform: {position: {x, y, z}, rotation: {x: -4 * (Math.PI / 180), y: 0, z: 0}},
			Node: {},
			WeaponController: {},
		}))}}
	]},
	ShipBehaviour: {},
});

const laserTurret = {a: 80 * PI, v: 40 * PI, model: laserTurretModel(laserNozzleModel)};
const rocketLauncher = {a: 0.8 * PI, v: 0.4 * PI, model: rocketTurretModel(rocketNozzleModel)};

const initShips = entities => {
	const runtime = entities.findComponent('Runtime');
	const mouseEvents = entities.findComponent('MouseEvents');
	const inputHandler = entities.findComponent('InputHandler');
	const movePos = inputHandler.moveMarker.transform.position;
	const viewPos = inputHandler.viewMarker.transform.position;
	movePos.set(3, 0, 0);
	viewPos.set(-3, 0, 0);
	const targetA = new Vector3();

	const ship = entities.createEntity(shipFramework(
		shipAModel,
		[
			Object.assign({position: {x: 0.3, y: 0.4, z: 0}}, laserTurret),
			Object.assign({position: {x: -0.3, y: 0.4, z: 0}}, rocketLauncher),
		]
	));
	ship.shipBehaviour.setTarget(movePos);

	const ship2 = entities.createEntity(shipFramework(
		shipBModel,
		[
			Object.assign({position: {x: 0, y: 0.4, z:  0.4}}, rocketLauncher),
			Object.assign({position: {x: 0, y: 0.4, z:  0.0}}, rocketLauncher),
			Object.assign({position: {x: 0, y: 0.4, z: -0.4}}, rocketLauncher),
		]
	));
	ship2.shipBehaviour.setTarget(viewPos);
	ship2.node.findComponents('WeaponController').forEach(wc => wc.setTarget(ship.transform.position));
	
	const weapons = ship.node.findComponents('WeaponController');
	weapons.forEach(wc => wc.setTarget(targetA));
	const ship1Laser = weapons[0].entity;
	const ship1Rocket = weapons[1].entity;

	const weaponGetModel = weapon => weapon.node.children[0].children[0].entity;
	const weaponGetNozzle = weapon => weapon.node.children[0].children[1].children[0].entity;
	const weaponSetVisible = (weapon, visible) => weaponGetNozzle(weapon).transform.visible = visible;

	weaponSetVisible(ship1Laser, false);
	weaponSetVisible(ship1Rocket, false);

	const updateLaser = nozzle =>	{
		const nozPos = new Vector3(), tarPos = new Vector3();
		nozzle.transform.getWorldPosition(nozPos); nozPos.y = 0;
		return target => {
			tarPos.copy(target); tarPos.y = 0;
			nozzle.transform.scale.z = nozPos.distanceTo(tarPos);
		};
	};

	const updateRocket = nozzle =>	{
		const nozPos = new Vector3(), tarPos = new Vector3();
		nozzle.transform.getWorldPosition(nozPos); nozPos.y = 0;
		return target => {
			//tarPos.copy(target); tarPos.y = 0;
			//nozzle.transform.scale.z = nozPos.distanceTo(tarPos);
		};
	};

	const weaponHandlers = [];
	weaponHandlers.push({
		nozzle: weaponGetNozzle(ship1Laser),
		target: targetA,
		handler: updateLaser(weaponGetNozzle(ship1Laser)),
	});
	weaponHandlers.push({
		nozzle: weaponGetNozzle(ship1Rocket),
		target: targetA,
		handler: updateLaser(weaponGetNozzle(ship1Rocket)),
	});
	
	runtime.OnBeforeRender.push(time => {
		if(mouseEvents.intersection) targetA.copy(mouseEvents.intersection.point);
		weaponHandlers.forEach(({nozzle, target, handler}) => {
			if(nozzle.transform.visible) handler(target);
		});
	});

	const {floor} = entities.findComponent('Environment');
	floor.addEventListener('mousedown', event => {
		if(event.buttons & 2) {
			console.log('Fire!', weapons);
			weaponSetVisible(ship1Laser, true);
			weaponSetVisible(ship1Rocket, true);
			setTimeout(() => {
				weaponSetVisible(ship1Laser, false);
				weaponSetVisible(ship1Rocket, false);
			}, 2000);
		}
	});
};

const createRuntime = () => {
	const entities = new EntityManager();
	entities.registerComponents(getComponentsFromModules(['ecsTHREE', 'ecsCore', 'Environment', 'CameraController']));
	entities.registerComponents([InputHandler, ShipBehaviour, WeaponController]);
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