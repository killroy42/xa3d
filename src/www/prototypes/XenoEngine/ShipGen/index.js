(function() {
const THREE = require('THREE');
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {createRuntime} = require('bootstrap');
const {Vector3, Object3D} = THREE;


// Materials
	const materialGoldJson = {
		color: 0xf5d061, 
		//specular: 0x009900,
		shininess: 550, 
		emissive: 0xe6af2e,
		emissiveIntensity: 0.5,
		transparent: true,
		opacity: 0.8,
	};
	const materialWhiteJson = {
		color: 0xffffff,
		//specular: 0x009900,
		shininess: 550,
		emissive: 0xffffff,
		emissiveIntensity: 0.5,
		transparent: true,
		opacity: 0.95,
	};
	const materialRedJson = {
		color: 0xff0000,
		//specular: 0x009900,
		shininess: 550,
		emissive: 0xff0000,
		emissiveIntensity: 0.5,
		transparent: true,
		opacity: 0.8,
	};
	const materialBlueJson = {
		color: 0x0000ff,
		//specular: 0x009900,
		shininess: 550,
		emissive: 0xff0000,
		emissiveIntensity: 0.5,
		transparent: true,
		opacity: 0.7,
		side: THREE.DoubleSide,
	};

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

const calcAccel = (x, v, maxA, dt) => {
	if(dt === 0) return 0;
	const signX = (x < 0)?-1:1;
	const signV = (v < 0)?-1:1;
	const a = signX * (Math.sqrt(Math.abs(1 + (2 * x) / (maxA * dt * dt))) * maxA - (v * signX) / dt - maxA);
	return Math.min(maxA, Math.max(-maxA, a));
};
const calcVelocity = (maxA, maxV, x, v, dt) => {
	const sign = (x < 0)?-1:1;
	const a = calcAccel(x * sign, v * sign, maxA, dt) * sign;
	return Math.max(-maxV, Math.min(maxV, v + a * dt));
};
const updateKinet = (kinet, dt) => {
	kinet.a = calcAccel(kinet.x, kinet.v, kinet.maxA, dt);
	kinet.v = Math.max(-kinet.maxV, Math.min(kinet.maxV, kinet.v + kinet.a * dt));
};

const createSpriteMaterial = imageUrl => {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext('2d');
	const img = new Image();
	//ctx.fillStyle = 'red'; ctx.fillRect(0, 0, canvas.width, canvas.height);
	img.crossOrigin = 'Anonymous';
	const spriteMap = new THREE.Texture(canvas);
	img.onload = (res) => {
		const aspect = img.width / img.height;
		const [w, h] = (aspect > 1)?[canvas.width, canvas.height / aspect]:[canvas.width * aspect, canvas.height];
		ctx.drawImage(img,
			0, 0, img.width, img.height,
			//0.5 * (canvas.width - w), 0, 0.5 * canvas.height, w
			0.5 * (canvas.width - w), 0.5 * (canvas.height - h), w, h
		);
		spriteMap.needsUpdate = true;
	};
	img.src = imageUrl;
	return new THREE.SpriteMaterial({map: spriteMap, color: 0xffffff});
};

const calcY = ({x, z}, time) =>
	Math.sin(0.08 * x + 0.12 * z + 0.0001 * time) * 1.5
	+ Math.sin(0.07 * x + 0.03 * z + 0.0003 * time) * 0.6
	+ Math.sin(0.03 * x - 0.01 * z + 0.00005 * time) * 1.8
	;

class SpriteComponent extends makeComponent(THREE.Sprite) {
	OnAttachComponent(entity) {
		const transform = entity.requireComponent('Transform');
		super.OnAttachComponent(entity);
		transform.add(this);
	}
	OnDetachComponent(entity) {
		entity.transform.remove(this);
	}
	fromJSON(json = {}) {
		this.material = json.material;
		return this;
	}
	toJSON() {
		return {
		};
	}
}

const createSpriteEntities = (parent, n) => {
	const spriteMaterial = createSpriteMaterial('/images/asteroid2.png');
	for(var i = 0; i < n; i++) {
		const a = 2 * Math.PI * Math.random();
		const r = Math.sqrt(Math.random()) * 50;
		const scale = 0.5 + 2 * Math.random();
		const sprite = parent.entities.createEntity({
			Transform: {
				position: {x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r},
				scale: {x: scale, y: scale, z: scale},
				parent: parent,
			},
			SpriteComponent: {material: spriteMaterial},
			//Collider: {}, Editable: {},
		});
		//sprite.collider.scale.multiply({x: 3, y: 1, z: 3});
	}
};

const updateSpriteTransforms = (transform, n) => time => {
	const asteroids = transform.children;
	if(asteroids.length < n) {
		createSpriteEntities(transform, Math.floor(Math.max(1, Math.min(n / 100, n - asteroids.length))));
	}
	for(let i = 0; i < asteroids.length; i++) {
		const position = asteroids[i].position;
		const {x, z} = position;
		position.y = calcY(position, time);
	}
};

const moveFollowers = (followers, target) => {
	const dir = new Vector3();
	const targetTransform = {quaternion: new THREE.Quaternion(), m: new THREE.Matrix4()};
	let t0 = 0, dt = 0;
	return time => {
		if(t0 == 0) {
			t0 = time;
			return;
		}
		dt = (time - t0) / 1000; t0 = time;
		for(let i = 0; i < followers.length; i++) {
			const follower = followers[i];
			if(follower.angular === undefined) {
				follower.angular = {
					maxA: (0.2 + 1 * Math.random()) * Math.PI,
					maxV: (1 + 1 * Math.random()) * Math.PI,
					v: 0
				};
				follower.linear = {
					maxA: (2 + 5 * Math.random()) * Math.PI,
					maxV: (15 + 15 * Math.random()) * Math.PI,
					v: 0
				};
			}
			targetTransform.m.lookAt(target, follower.position, follower.up);
			targetTransform.quaternion.setFromRotationMatrix(targetTransform.m);
			let ang = calcAngularDistance(follower, targetTransform);
			follower.angular.v = calcVelocity(follower.angular.maxA, follower.angular.maxV, ang, follower.angular.v, dt);
			follower.rotation.y += follower.angular.v * dt;
			dir.subVectors(
				new Vector3(target.x, 0, target.z),
				new Vector3(follower.position.x, 0, follower.position.z)
			);
			const dist = Math.max(0, dir.length() - 1);
			follower.linear.v = calcVelocity(follower.linear.maxA, follower.linear.maxV, dist, follower.linear.v, dt);
			follower.translateZ(follower.linear.v * dt);
		}
	};
};

const startCam = entities => {
	const orbitCam = entities.findComponent('OrbitCamComponent');
	const setCam = (cam, onComplete) => orbitCam.slideCamera(cam.position, cam.target, cam.speed, onComplete);
	const cams = [
		{position: new Vector3(0, 200, 20), target: new Vector3(0, 0, 0), speed: 1e9},
		{position: new Vector3(70, 80, 40), target: new Vector3(20, 10, 10), speed: 40},
		{position: new Vector3(0, 30, 60), target: new Vector3(0, -20, 0), speed: 20},
		{position: new Vector3(0, 30, 60), target: new Vector3(0, -20, 0), speed: 1e9},
		{position: new Vector3(0, 40, 20), target: new Vector3(0, 0, 0), speed: 1e9},
	];
	//setCam(cams[0], ()=>setCam(cams[1], ()=>setCam(cams[2])));
	//setCam(cams[3]);
	setCam(cams[4]);
};

const moveCarrier = (ship, target) => {
	const targetTransform = {quaternion: new THREE.Quaternion(), m: new THREE.Matrix4()};
	let t0 = 0, dt = 0;
	const t = ship.transform;
	const thursterFL = ship.node.children[1].entity.transform;
	const thursterFR = ship.node.children[2].entity.transform;
	const thursterRL = ship.node.children[3].entity.transform;
	const thursterRR = ship.node.children[4].entity.transform;
	const thursterR = ship.node.children[5].entity.transform;
	const thursterF = ship.node.children[6].entity.transform;
	const posV = new Vector3(), targetV = new Vector3();
	const orbitCam = ship.entities.findComponent('OrbitCamComponent');
	return time => {
		if(t0 == 0) {
			t0 = time;
			return;
		}
		dt = (time - t0) / 1000; t0 = time;
		// Angular
			targetTransform.m.lookAt(target, t.position, t.up);
			targetTransform.quaternion.setFromRotationMatrix(targetTransform.m);
			t.angular.x = calcAngularDistance(t, targetTransform);
			updateKinet(t.angular, dt);
		
		// Linear
			posV.set(t.position.x, 0, t.position.z);
			targetV.set(target.x, 0, target.z);
			t.linear.x = Math.max(0, posV.distanceTo(targetV) - 3);
			updateKinet(t.linear, dt);
		
		const pan = t.rotation.y + t.angular.v * dt;
		const roll = -0.8 * Math.PI
			* (
					(0.5 * ((t.angular.maxV===0)?0:t.angular.v / t.angular.maxV)) 
				//* (1.5 * ((t.linear.maxV===0)?0:t.linear.v / t.linear.maxV))
				* (1.5 * ((t.linear.maxV===0)?0:t.linear.v / 20))
			);

		t.rotation.z = 0;
		t.rotation.y = pan;
		t.translateZ(t.linear.v * dt);
		t.rotation.z = roll;
		
		thursterFL.scale.x = Math.max(0.01, -10 * t.angular.a);
		thursterRR.scale.x = Math.max(0.01, -10 * t.angular.a);
		thursterFR.scale.x = Math.max(0.01,  10 * t.angular.a);
		thursterRL.scale.x = Math.max(0.01,  10 * t.angular.a);
		thursterR.scale.z = Math.max(0.01, 10 * t.linear.a);
		thursterF.scale.z = Math.max(0.01, -4 * t.linear.a);

		/*
		orbitCam.camera.rotation.z = 0;
		orbitCam.setCamera(
			t.position.clone()
				.add(new Vector3(0, 5, -10).applyQuaternion(t.quaternion)),
			t.position.clone()
				.add(new Vector3(0, 0, 20).applyQuaternion(t.quaternion))
		);
		orbitCam.camera.rotateZ(-roll);
		*/
		
	};
};

const moveFighter = (ship, target) => {
	const targetTransform = {quaternion: new THREE.Quaternion(), m: new THREE.Matrix4()};
	let t0 = 0, dt = 0;
	const t = ship.transform;
	const thursterFL = ship.node.children[1].entity.transform;
	const thursterFR = ship.node.children[2].entity.transform;
	const thursterRL = ship.node.children[3].entity.transform;
	const thursterRR = ship.node.children[4].entity.transform;
	const thursterR = ship.node.children[5].entity.transform;
	const thursterF = ship.node.children[6].entity.transform;
	const posV = new Vector3(), targetV = new Vector3();
	const orbitCam = ship.entities.findComponent('OrbitCamComponent');
	return time => {
		if(t0 == 0) {
			t0 = time;
			return;
		}
		dt = (time - t0) / 1000; t0 = time;
		// Angular
			targetTransform.m.lookAt(target, t.position, t.up);
			targetTransform.quaternion.setFromRotationMatrix(targetTransform.m);
			t.angular.x = calcAngularDistance(t, targetTransform);
			updateKinet(t.angular, dt);
		
		// Linear
			posV.set(t.position.x, 0, t.position.z);
			targetV.set(target.x, 0, target.z);
			t.linear.x = Math.max(0, posV.distanceTo(targetV) - 3);
			updateKinet(t.linear, dt);

		const pan = t.rotation.y + t.angular.v * dt;
		const roll = -0.8 * Math.PI
			* (
					(0.5 * ((t.angular.maxV===0)?0:t.angular.v / t.angular.maxV)) 
				* (1.5 * ((t.linear.maxV===0)?0:t.linear.v / t.linear.maxV))
			);

		t.rotation.z = 0;
		t.rotation.y = pan;
		t.translateZ(t.linear.v * dt);
		t.rotation.z = roll;
		
		thursterFL.scale.x = Math.max(0.01, -0.2 * t.angular.a);
		thursterRR.scale.x = Math.max(0.01, -0.2 * t.angular.a);
		thursterFR.scale.x = Math.max(0.01,  0.2 * t.angular.a);
		thursterRL.scale.x = Math.max(0.01,  0.2 * t.angular.a);
		thursterR.scale.z = Math.max(0.01, 0.05 * t.linear.a);
		thursterF.scale.z = Math.max(0.01, -0.03 * t.linear.a);

		if(Math.abs(t.linear.x) <= 6) {
			target.add(new Vector3((-1 + 2 * Math.random()) * 20, 0, (-1 + 2 * Math.random()) * 20));
		}
		
		/*
		orbitCam.camera.rotation.z = 0;
		orbitCam.setCamera(
			t.position.clone()
				.add(new Vector3(0, 5, -10).applyQuaternion(t.quaternion)),
			t.position.clone()
				.add(new Vector3(0, 0, 20).applyQuaternion(t.quaternion))
		);
		orbitCam.camera.rotateZ(-roll);
		*/
		
	};
};

const init = () => {
	const runtime = createRuntime();
	const entities = runtime.entities;
	
	entities.registerComponents([SpriteComponent]);
	//const sprites = entities.createEntity({Transform: {position: {y: 3}}});
	//runtime.OnBeforeRender.push(updateSpriteTransforms(sprites.transform, 500));

	const carrier = entities.createEntity({
		Transform: {},
		Node: {children: [
			//{Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 0.1, y: 0.1, z: 0.1}}, BoxMesh: {}},
			{
				Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 2, y: 4, z: 10}},
				PhongMaterial: materialWhiteJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: 0.95, y: 0, z: 4}, scale: {x: 0.01, y: 0.5, z: 0.5}},
				PhongMaterial: materialGoldJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: -0.95, y: 0, z: 4}, scale: {x: 0.01, y: 0.5, z: 0.5}},
				PhongMaterial: materialGoldJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: 0.95, y: 0, z: -4}, scale: {x: 0.01, y: 0.5, z: 0.5}},
				PhongMaterial: materialGoldJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: -0.95, y: 0, z: -4}, scale: {x: 0.01, y: 0.5, z: 0.5}},
				PhongMaterial: materialGoldJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: 0, y: 0, z: -4.95}, scale: {x: 1.5, y: 1.5, z: 0.01}},
				PhongMaterial: materialGoldJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: 0, y: 0, z: 4.95}, scale: {x: 1.5, y: 1.5, z: 0.01}},
				Node: {children: [
					{
						Transform: {position: {x: 0.4, y: 0.4, z: 0}, scale: {x: 0.3, y: 0.3, z: 1}},
						PhongMaterial: materialGoldJson,
						BoxGeometryComponent: {},
						GenericMeshComponent: {}
					},
					{
						Transform: {position: {x: -0.4, y: 0.4, z: 0}, scale: {x: 0.3, y: 0.3, z: 1}},
						PhongMaterial: materialGoldJson,
						BoxGeometryComponent: {},
						GenericMeshComponent: {}
					},
					{
						Transform: {position: {x: 0.4, y: -0.4, z: 0}, scale: {x: 0.3, y: 0.3, z: 1}},
						PhongMaterial: materialGoldJson,
						BoxGeometryComponent: {},
						GenericMeshComponent: {}
					},
					{
						Transform: {position: {x: -0.4, y: -0.4, z: 0}, scale: {x: 0.3, y: 0.3, z: 1}},
						PhongMaterial: materialGoldJson,
						BoxGeometryComponent: {},
						GenericMeshComponent: {}
					},
				]}
			},
		]},
		//Collider: {},
		//Editable: {}
	});
	carrier.transform.position.y = 5;
	carrier.transform.position.x = 10;
	carrier.transform.angular = {
		maxA: (0.02) * Math.PI,
		maxV: (0.2) * Math.PI,
		v: 0
	};
	carrier.transform.linear = {
		maxA: (1),
		maxV: (5),
		v: 0
	};

	const fighter = entities.createEntity({
		Transform: {scale: {x: 0.3, y: 0.3, z: 0.3}},
		Node: {children: [
			{
				Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 2, y: 0.3, z: 3}},
				PhongMaterial: materialWhiteJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: 0.95, y: 0, z: 1.3}, scale: {x: 0.01, y: 0.1, z: 0.1}},
				PhongMaterial: materialGoldJson, BoxGeometryComponent: {}, GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: -0.95, y: 0, z: 1.3}, scale: {x: 0.01, y: 0.1, z: 0.1}},
				PhongMaterial: materialGoldJson, BoxGeometryComponent: {}, GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: 0.95, y: 0, z: -1.3}, scale: {x: 0.01, y: 0.1, z: 0.1}},
				PhongMaterial: materialGoldJson, BoxGeometryComponent: {}, GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: -0.95, y: 0, z: -1.3}, scale: {x: 0.01, y: 0.1, z: 0.1}},
				PhongMaterial: materialGoldJson, BoxGeometryComponent: {}, GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: 0, y: 0, z: -1.45}, scale: {x: 1.8, y: 0.18, z: 0.01}},
				PhongMaterial: materialGoldJson, BoxGeometryComponent: {}, GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: 0, y: 0, z: 1.45}, scale: {x: 1.5, y: 1.5, z: 0.01}},
				Node: {children: [
					{
						Transform: {position: {x: 0.6, y: 0, z: 0}, scale: {x: 0.2, y: 0.07, z: 1}},
						PhongMaterial: materialGoldJson, BoxGeometryComponent: {}, GenericMeshComponent: {}
					},
					{
						Transform: {position: {x: -0.6, y: 0, z: 0}, scale: {x: 0.2, y: 0.07, z: 1}},
						PhongMaterial: materialGoldJson, BoxGeometryComponent: {}, GenericMeshComponent: {}
					},
				]}
			},
			{
				Transform: {position: {x: 0, y: 0, z: -1}, scale: {x: 4, y: 0.15, z: 1}},
				PhongMaterial: materialWhiteJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
		]}
	});
	fighter.transform.position.y = 8;
	fighter.transform.angular = {
		maxA: (4) * Math.PI,
		maxV: (2) * Math.PI,
		v: 0
	};
	fighter.transform.linear = {
		maxA: (30),
		maxV: (40),
		v: 0
	};

	const carrierTarget = entities.createEntity({
		Transform: {},
		Node: {children: [
			{
				Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 1.5, y: 1.5, z: 1.5}, rotation: {x: 0, y: 0.25 * Math.PI, z: 0}},
				PhongMaterial: materialBlueJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: 0, y: 2.5, z: 0}, scale: {x: 0.2, y: 5, z: 0.2}, rotation: {x: 0, y: 0.25 * Math.PI, z: 0}},
				PhongMaterial: materialBlueJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
		]}
	});
	const fighterTarget = entities.createEntity({
		Transform: {},
		Node: {children: [
			{
				Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}, rotation: {x: 0, y: 0.25 * Math.PI, z: 0}},
				PhongMaterial: materialRedJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
			{
				Transform: {position: {x: 0, y: 4, z: 0}, scale: {x: 0.2, y: 8, z: 0.2}, rotation: {x: 0, y: 0.25 * Math.PI, z: 0}},
				PhongMaterial: materialRedJson,
				BoxGeometryComponent: {},
				GenericMeshComponent: {}
			},
		]}
	});


	entities.findComponent('Environment').floor.addEventListener('click', event => {
		if(event.button === 0) {
			carrierTarget.transform.position.copy(event.intersection.point);
		}else if(event.button === 2) {
			fighterTarget.transform.position.copy(event.intersection.point);
		}
	});

	document.body.addEventListener('touchstart', event => {
		carrierTarget.transform.position.set((-1 + 2 * Math.random()) * 50, 0, (-1 + 2 * Math.random()) * 50);
		fighterTarget.transform.position.set((-1 + 2 * Math.random()) * 50, 0, (-1 + 2 * Math.random()) * 50);
	});
	//runtime.OnBeforeRender.push(moveFollowers(sprites.transform.children, target));

	runtime.OnBeforeRender.push(moveCarrier(carrier, carrierTarget.transform.position));
	runtime.OnBeforeRender.push(moveFighter(fighter, fighterTarget.transform.position));

	//startCam(entities);

	runtime.start();
};

document.addEventListener('DOMContentLoaded', init);

})();