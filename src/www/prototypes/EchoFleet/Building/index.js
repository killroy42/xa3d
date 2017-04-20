(function() {
const THREE = require('THREE');
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {Vector3, Matrix4, Quaternion} = THREE;
const Accelerator = require('Accelerator');


const PI = Math.PI, PI2 = PI * 2;
const calcAngularDistance = (() => {
	const cross = new Vector3();
	return (va, vb) => {
		const direction = (cross.crossVectors(va, vb).y > 0)?-1:1;
		return direction * va.angleTo(vb);
	};
})();
const calcAngleTransformToVector = (() => {
	const target = new Vector3();
	const p = new Vector3, q = new Quaternion(), s = new Vector3(), v = new Vector3();
	return (transform, targetV) => {
		transform.updateMatrixWorld(false);
		transform.matrixWorld.decompose(p, q, s);
		v.copy(targetV);
		v.sub(p);
		v.y = 0;
		target.set(0, 0, 1);
		target.applyQuaternion(q);
		target.y = 0;
		return calcAngularDistance(v, target);
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
		this.turnA = 0.5 * Math.PI;
		this.turnV = 10 * Math.PI;
		this.moveA = 1;
		this.moveV = 3;
		this.proximityTolerance = 1;
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
		const turnAccelerator = new Accelerator(this.turnA, this.turnV);
		const moveAccelerator = new Accelerator(this.moveA, this.moveV);
		const position = new Vector3(), target = new Vector3();
		const axis = new Vector3(0, 1, 0);
		let t0, dt;
		const handleOnBeforeUpdate = time => {
			if(t0 === undefined) { t0 = time; return; }
			dt = (time - t0) * 0.001; t0 = time;
			if(this.target !== undefined) {
				turnAccelerator.maxA = this.turnA;
				turnAccelerator.maxV = this.turnV;
				moveAccelerator.maxA = this.moveA;
				moveAccelerator.maxV = this.moveV;
				// Turning
					const angX = calcAngleTransformToVector(transform, this.target);
					const angV = turnAccelerator.update(angX, dt);
					//const pan = transform.rotation.y + angV;
				// Moving
					position.set(transform.position.x, 0, transform.position.z);
					target.set(this.target.x, 0, this.target.z);
					const linDist = Math.max(0, position.distanceTo(target) - this.proximityTolerance);
					const translation = moveAccelerator.update(linDist, dt);
				transform.rotateOnAxis(axis, angV);
				//transform.rotation.y = pan;
				transform.translateZ(translation);
			}
		};
		return handleOnBeforeUpdate;
	}
	fromJSON(json = {}) {
		const {moveA, moveV, turnA, turnV} = json;
		if(moveA) this.moveA = moveA;
		if(moveV) this.moveV = moveV;
		if(turnA) this.turnA = turnA;
		if(turnV) this.turnV = turnV;
	}
}

class WeaponController {
	constructor() {
		this.target = undefined;
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
		const turnAccelerator = new Accelerator(this.turnA, this.turnV);
		const axis = new Vector3(0, 1, 0);
		let t0, dt;
		const handleOnBeforeUpdate = time => {
			if(t0 === undefined) { t0 = time; return; }
			dt = (time - t0) * 0.001; t0 = time;
			if(this.target !== undefined) {
				turnAccelerator.maxA = this.turnA;
				turnAccelerator.maxV = this.turnV;
				const angX = calcAngleTransformToVector(transform, this.target);
				const angV = turnAccelerator.update(angX, dt);
				transform.rotateOnAxis(axis, angV);
			}
		};
		return handleOnBeforeUpdate;
	}
	setNozzle(nozzle) {
		//console.info('WeaponController.setNozzle(nozzle);', nozzle);
		this.entity.node.children[0].children[0].attach(nozzle);
		this._nozzle = nozzle;
		this.setNozzleVisible(false);
	}
	setNozzleVisible(visible) {
		//console.info('WeaponController.setNozzleVisible(%s);', visible);
		return this._nozzle.transform.visible = visible;
	}
	fire() {
		//console.info('WeaponController.fire();');
		if(this._onFire) this._onFire(this);
	}
	fromJSON(json = {}) {
		//console.info('WeaponController.fromJSON(json);', this.entity.id);
		const {a, v, target, nozzle, onFire} = json;
		if(a) this.turnA = a;
		if(v) this.turnV = v;
		if(target) this.setTarget(target);
		if(nozzle) this.setNozzle(this.entities.createEntity(nozzle));
		if(onFire) this._onFire = onFire;
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
	const laserTurretModel = {
		Transform: {},
		Node: {children: [
			{Transform: {position: {x: 0, y: 0, z: 0.5}}, Node: {}},
			{
				Transform: {position: {x: 0, y: 0, z: 0.0}, scale: {x: 0.2, y: 0.06, z: 0.2}},
				PhongMaterial: matWhite,
				BoxGeometryComponent: {},
				GenericMeshComponent: {},
			},
			{
				Transform: {position: {x: 0, y: 0, z: 0.2}, scale: {x: 0.1, y: 0.03, z: 0.6}},
				PhongMaterial: matWhite,
				BoxGeometryComponent: {},
				GenericMeshComponent: {},
			},
		]}
	};
	const laserNozzleModel = {
		Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}},
		Node: {children: [
			{
				Transform: {position: {x: 0, y: 0, z: 0.5}, scale: {x: 0.03, y: 0.02, z: 1}},
				PhongMaterial: matLaserGreen,
				BoxGeometryComponent: {},
				GenericMeshComponent: {},
			}
		]}
	};
	const rocketTurretModel = {
		Transform: {},
		Node: {children: [
			{Transform: {position: {x: 0, y: 0, z: 0.1}}, Node: {}},
			{
				Transform: {position: {x: 0, y: 0, z: -0.05}, scale: {x: 0.24, y: 0.14, z: 0.3}},
				PhongMaterial: matWhite,
				BoxGeometryComponent: {},
				GenericMeshComponent: {},
			},
		]}
	};
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
	const rocketModel = {
		Transform: {},
		Node: {children: [
			{
				Transform: {scale: {x: 0.1, y: 0.1, z: 0.1}},
				Node: {children: [
					{
						Transform: {
							position: {x: 0, y: 0, z: 0.5},
							scale: {x: 0.35, y: 0.35, z: 0.7},
						},
						PhongMaterial: matWhite,
						SphereGeometryComponent: {},
						GenericMeshComponent: {},
					},
					{
						Transform: {
							position: {x: 0, y: 0, z: 0},
							scale: {x: 0.6, y: 0.6, z: 1},
							rotation: {x: 0, y: 0, z: 0.25 * PI}
						},
						PhongMaterial: matWhite,
						BoxGeometryComponent: {},
						GenericMeshComponent: {},
					},
					{
						Transform: {
							position: {x: 0, y: 0, z: -0.6},
							scale: {x: 0.5, y: 0.5, z: 0.2},
							rotation: {x: 0, y: 0, z: 0.25 * PI}
						},
						PhongMaterial: matRocketRed,
						BoxGeometryComponent: {},
						GenericMeshComponent: {},
					},
					{
						Transform: {
							position: {x: 0, y: 0, z: -0.9},
							scale: {x: 0.2, y: 0.2, z: 1},
						},
						PhongMaterial: matRocketRed,
						SphereGeometryComponent: {},
						GenericMeshComponent: {},
					},
				]},
			}
		]},
	};
	const targetDummyModel = {
		Transform: {position: {x: 0, y: 1, z: 0}, scale: {x: 1, y: 1, z: 1}},
		Collider: {},
		Node: {children: [
			{
				Transform: {scale: {x: 0.3, y: 0.3, z: 0.3}},
				Node: {children: [
					{
						Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}},
						PhongMaterial: matGold,
						//BoxGeometryComponent: {},
						IcosahedronGeometryComponent: {},
						GenericMeshComponent: {},
					},
				]},
			}
		]},
	};

const weaponFramework = ({position, a, v, turret, nozzle, onFire}) => ({
	Transform: {position, rotation: {x: -4 * (Math.PI / 180), y: 0, z: 0}},
	Node: {children: [turret]},
	WeaponController: {a, v, nozzle, onFire},
});

const shipFramework = (model, weapons) => ({
	Transform: {position: {x: 0, y: 0.4, z: 0}},
	Node: {children: [
		model,
		{Transform: {}, Node: {children: weapons.map(weaponFramework)}}
	]},
	ShipBehaviour: {},
});

const handleLaserFire = (weapon) => {
	//console.info('handleLaserFire(weapon);');
	if(weapon.__isFiring) return;
	const runtime = weapon.entities.findComponent('Runtime');
	weapon.__isFiring = true;
	weapon.setNozzleVisible(true);
	const axis = new Vector3(0, 1, 0);
	const nozzle = weapon._nozzle.transform;
	const target = weapon.target;
	const nozPos = new Vector3(), tarPos = new Vector3();
	const onBeforeRenderHandler = time => {
		nozzle.getWorldPosition(nozPos); nozPos.y = 0;
		tarPos.copy(target); tarPos.y = 0;
		nozzle.scale.z = nozPos.distanceTo(tarPos) - 0.1;
		weapon.setNozzleVisible(Math.random() < 0.8);
		//nozzle.rotateOnAxis(axis, (-1 + 2 * Math.random()) * 0.2 * PI / 180);
		nozzle.rotation.y = (-1 + 2 * Math.random()) * 0.5 * PI / 180;
	};
	runtime.OnBeforeRender.push(onBeforeRenderHandler);
	setTimeout(() => {
		weapon.setNozzleVisible(false);
		weapon.__isFiring = false;
		const idx = runtime.OnBeforeRender.indexOf(onBeforeRenderHandler);
		runtime.OnBeforeRender.splice(idx, 1);
	}, 1000);
};
const handleRocketFire = (weapon) => {
	if(weapon.__isFiring) return;
	const loadRocket = (() => {
		const north = new Vector3(0, 0, 1);
		const axis = new Vector3(0, 1, 0);
		const v = new Vector3(), p = new Vector3, q = new Quaternion(), s = new Vector3();
		return (rocket, nozzle) => {
			nozzle.updateMatrixWorld(false);
			nozzle.matrixWorld.decompose(p, q, s);
			v.set(0, 0, 1);
			v.applyQuaternion(q);
			v.y = 0;
			const ang = calcAngularDistance(v, north);
			rocket.transform.rotation.set(0, 0, 0);
			rocket.transform.rotateOnAxis(axis, ang);
			rocket.transform.position.copy(p);
			return rocket;
		};
	})();
	const createRocket = (entities) => {
		const rocket = entities.createEntity(rocketModel);
		const shipBehaviour = rocket.requireComponent('ShipBehaviour');
		shipBehaviour.moveA = 10;
		shipBehaviour.moveV = 200;
		shipBehaviour.turnA = 1 * Math.PI;
		shipBehaviour.turnV = 1 * Math.PI;
		shipBehaviour.proximityTolerance = 0.5;
		return rocket;
	};
	const getRocket = (weapon) => {
		if(weapon.__rockets === undefined) weapon.__rockets = [];
		const rocketIdx = weapon.__rockets.findIndex(r => r.__inUse === false);
		let rocket;
		if(rocketIdx === -1) {
			rocket = createRocket(weapon.entities);
			weapon.__rockets.push(rocket);
		} else {
			rocket = weapon.__rockets[rocketIdx];
		}
		return rocket;
	};
	const launchRocket = (rocket) => {
		rocket.__inUse = true;
		rocket.transform.visible = true;
		setTimeout(() => {
			rocket.__inUse = false;
			rocket.transform.visible = false;
		}, 2500);
		return rocket;
	};
	const fireRocketLauncher = (weapon) => {
		const nozzle = weapon._nozzle.transform;
		const rocket = getRocket(weapon);
		rocket.shipBehaviour.setTarget(weapon.target);
		loadRocket(rocket, nozzle);
		launchRocket(rocket);
		weapon.__isFiring = true;
		weapon.setNozzleVisible(true);
		setTimeout(() => {
			weapon.setNozzleVisible(false);
			weapon.__isFiring = false;
		}, 100);
	};
	for(var i = 0; i < 5; i++) {
		setTimeout(() => fireRocketLauncher(weapon), i * 300);
	}
};

const laserTurret = {
	a: 80 * PI, v: 40 * PI,
	turret: laserTurretModel,
	nozzle: laserNozzleModel,
	onFire: handleLaserFire,
};
const rocketLauncher = {
	a: 0.8 * PI, v: 0.4 * PI,
	turret: rocketTurretModel,
	nozzle: rocketNozzleModel,
	onFire: handleRocketFire,
};

const initTargetDummies = entities => {
	const runtime = entities.findComponent('Runtime');
	const targetDummies = new Array(12);
	const colorTargetDummy = (targetDummy, color) => {
		targetDummy.node.children[0].children[0].entity.phongMaterial.fromJSON(color);	
	};
	const moveTargetDummy = (targetDummy, time = 0) => {
		const angle = targetDummy.angle * PI / 180 + time * 0.00003 * PI;
		const radius = 4;
		targetDummy.transform.position.set(Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius);
	};
	const handleTargetDummyClick = event => {
		const targetDummy = event.target.entity;
		targetDummies.forEach(dummy => colorTargetDummy(dummy, matGold));
		colorTargetDummy(targetDummy, matMarkerRed);
		targetDummy.dispatchEvent('selected', targetDummy);
	};
	const createTargetDummy = (angle) => {
		const targetDummy = entities.createEntity(targetDummyModel);
		targetDummy.collider.refresh();
		targetDummy.angle = angle;
		targetDummy.name = `TargetDummy[${angle}]`;
		targetDummy.node.children[0].children[0].entity.phongMaterial.shading = THREE.FlatShading;
		moveTargetDummy(targetDummy);
		targetDummy.collider.addEventListener('click', handleTargetDummyClick);
		return targetDummy;
	};
	for(var i = 0; i < targetDummies.length; i++) {
		targetDummies[i] = createTargetDummy(i / targetDummies.length * 360);
	}
	runtime.OnBeforeRender.push(time => {
		targetDummies.forEach(targetDummy => moveTargetDummy(targetDummy, time));
	});
	return targetDummies;
};

const initShips = entities => {
	const runtime = entities.findComponent('Runtime');
	const mouseEvents = entities.findComponent('MouseEvents');
	const inputHandler = entities.findComponent('InputHandler');
	const movePos = inputHandler.moveMarker.transform.position;
	const viewPos = inputHandler.viewMarker.transform.position;
	movePos.set(3, 0, 0);
	viewPos.set(-3, 0, 0);

	const targetA = new Vector3();
	const targetB = new Vector3();
	runtime.OnBeforeRender.push(time => {
		if(mouseEvents.intersection) targetA.copy(mouseEvents.intersection.point);
	});
	
	const ship = entities.createEntity(shipFramework(
		shipAModel,
		[
			Object.assign({position: {x: 0.3, y: 0.4, z: 0}}, laserTurret),
			Object.assign({position: {x: -0.3, y: 0.4, z: 0}}, laserTurret),
			Object.assign({position: {x: 0.0, y: 0.4, z: 0.4}}, rocketLauncher),
		]
	));
	ship.shipBehaviour.setTarget(movePos);
	const weapons1 = ship.node.findComponents('WeaponController');
	
	const ship2 = entities.createEntity(shipFramework(
		shipBModel,
		[
			Object.assign({position: {x: 0, y: 0.4, z:  0.4}}, rocketLauncher),
			Object.assign({position: {x: 0, y: 0.4, z:  0.0}}, rocketLauncher),
			Object.assign({position: {x: 0, y: 0.4, z: -0.4}}, rocketLauncher),
		]
	));
	ship2.shipBehaviour.setTarget(targetB);
	const weapons2 = ship2.node.findComponents('WeaponController');
	weapons2.forEach(wc => wc.setTarget(ship.transform.position));
	
	const createTargetMover = target => {
		const moveTarget = () => {
			target.set((-1 + 2 * Math.random()) * 6, 0, (-1 + 2 * Math.random()) * 5);
			setTimeout(moveTarget, (3 * Math.random()) * 1000);
		};
		moveTarget();
	};
	const createFiringBehaviour = weapons => {
		const fireOnTarget = () => {
			weapons.forEach(wc => wc.fire());
			setTimeout(fireOnTarget, (1 + 4 * Math.random()) * 1000);
		};
		setTimeout(fireOnTarget, (1 + 4 * Math.random()) * 1000);
	};

	weapons1.forEach(wc => wc.setTarget(ship2.transform.position));
	//createTargetMover(movePos);
	//createFireControl(weapons1);

	weapons2.forEach(wc => wc.setTarget(ship.transform.position));
	//createTargetMover(targetB);
	//createFireControl(weapons2);
	
	const collider = ship2.requireComponent('Collider');
	collider.refresh();
	collider.addEventListener('click', event => aquireTarget(event.target.entity));

	let currentTarget;
	const aquireTarget = target => {
		if(target !== currentTarget) {
			console.log('Aquiring new target:', target.name);
			currentTarget = target;
			weapons1.forEach(wc => wc.setTarget(currentTarget.transform.position));
		} else {
			console.log('Firing on target:', target.name);
			currentTarget.node.children[0].children[0].entity.phongMaterial.fromJSON(matMarkerGreen);
			weapons1.forEach(wc => wc.fire());
		}
	};

	const targetDummies = initTargetDummies(entities);
	// Target + fire
	//targetDummies.forEach(dummy => dummy.addEventListener('selected', aquireTarget));
	// Build + target

	const attachWeaponToPlatform = (platform, weapon) => {
		if(platform.weapon === undefined) {
			const node = platform.requireComponent('Node');
			node.attach(entities.createEntity({
				Transform: {},
				Node: {children: [
					weaponFramework(Object.assign({position: {x: 0, y: 0.4, z: 0}}, weapon))
				]}
			}));
			platform.weapon = node.findComponents('WeaponController')[0];
		} else {
			const turret = platform.weapon.entity;
			turret.node.children[0].detach();
			const newModel = platform.entities.createEntity(weapon.turret);
			turret.node.attach(newModel);
			platform.weapon.fromJSON(weapon);
		}
		return platform.weapon;
	};

	targetDummies.forEach(dummy => dummy.addEventListener('selected', targetDummy => {
		const weaponType = Math.random() > 0.5?rocketLauncher:laserTurret;
		let isNew = targetDummy.weapon === undefined;
		const weapon = attachWeaponToPlatform(targetDummy, weaponType);
		if(isNew) {
			weapon.setTarget(ship.transform.position);
			createFiringBehaviour([weapon]);
		}
	}));
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