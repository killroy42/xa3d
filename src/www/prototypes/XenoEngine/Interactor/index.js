(function() {
const THREE = require('THREE');
const assetdata = require('assetdata');
const {colors, dimensions} = assetdata;
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {Vector3, Face3} = THREE;
const {
	Transform, Collider, MeshComponent,
	Runtime, OrbitCamComponent, Cursor,
	TransformHandle, FontLoaderComponent, Text,
	TextureLoaderComponent,
	CSSFontLoaderComponent,
} = require('ecsTHREE');
const {
	EntityStore,
	Node, Button, Editable,
	ContextMenu, ContextMenuButton
} = require('ecsEditor');
const {
	getRandomColor, CardData, Card, CardMesh, CardAnimator,
	BallCard, RoundedCornersCard, XACard
} = require('ecsCards');
const {ZoneData, CardZone} = require('ecsZones');
const Environment = require('Environment');
const {targetFactory} = require('cardTargeting');
const {cloneDeep} = require('_');
const {normalizeUVs} = require('GeometryHelpers');
const DebugGraph = require('DebugGraph');


const Components = [
	Runtime,
	Transform, Collider,
	Cursor, OrbitCamComponent,
	Environment,
	FontLoaderComponent, Text, TransformHandle,
	EntityStore,
	Button,
	Node, ContextMenu, Editable,
	CardData, Card, CardMesh,
	BallCard, RoundedCornersCard, XACard,
	CardAnimator,
	ZoneData, CardZone,
	TextureLoaderComponent,
	CSSFontLoaderComponent,
];

const runtimeJson = {
	Runtime: {},
	OrbitCamComponent: {position: {x: 0, y: 10.6, z: 3.7}, target: {x: 0, y: 0, z: 0.7}},
	Cursor: {},
	TransformHandle: {},
	EntityStore: {},
	Environment: {},
	FontLoaderComponent: {},
	TextureLoaderComponent: {},
	CSSFontLoaderComponent: {},
};

// Pure math helpers
	const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
	const roundTo = (roundTo = 2) => n => Math.round((0.5 / Math.PI) * n * Math.pow(10, roundTo)) / Math.pow(10, roundTo);
	const PI2 = Math.PI * 2;
	const normalizeAngle = a => ((a >= 0)?a:PI2 - (-a % PI2)) % PI2;
	const calcAngularDistance = (a, b) => {
		a = normalizeAngle(a);
		b = normalizeAngle(b);
		let d = normalizeAngle(b - a);
		if(d > Math.PI) d = -(PI2 - d);
		return d;
	};
	const calcStoppingDistance = (v, a) => (a === 0)?0:((v * v) / (2 * a));
	const calcStoppingAcceleration = (v, d) => (d === 0)?-v:((v * v) * (1 / Math.abs(d)) * 0.5);
	const calcD = (v, a, t) => t * v + a * (t * t);
	const calcAccel = maxV => (v, a) => clamp(v + a, -maxV, maxV);
	const dOverTime = maxV => (d, v, a, t = 0) => (t <= 0)?d:dOverTime(d = d - (v = calcAccel(maxV)(v, a)), v, a, --t);
	const makeRotatorFunc = (getAccelFunc, maxA, maxV, initialV = 0) => {
		let calcAccelMaxV = calcAccel(maxV);
		const accelFunc = getAccelFunc(maxA);
		const rotator = function(d) {
			const sign = (d < 0)?-1:1;
			const v = rotator.v;
			rotator.a = accelFunc(d * sign, v * sign) * sign;
			rotator.v = calcAccelMaxV(v, rotator.a);
			return rotator.v;
		};
		rotator.maxA = maxA;
		rotator.maxV = maxV;
		rotator.a = 0;
		rotator.v = clamp(initialV, -maxV, maxV);
		return rotator;
	};

// THREE.js math helpers
	const getAngles = (ta, tb) => {
		const m = new THREE.Matrix4();
		const v0 = new THREE.Vector3(0, 0, 1);
		const v1 = v0.clone();
		const v2 = v0.clone();
		v1.transformDirection(m.makeRotationFromQuaternion(ta.quaternion));
		v1.y = 0;
		v2.transformDirection(m.makeRotationFromQuaternion(tb.quaternion));
		v2.y = 0;
		var a = v0.angleTo(v1);
		var b = v0.angleTo(v2);
		if(Math.sign(v1.x) < 0) a *= -1;
		if(Math.sign(v2.x) < 0) b *= -1;
		return [normalizeAngle(a), normalizeAngle(b)];
	};

// Testing
	const evalScenario = (d, t, rotator) => {
		const result = [];
		let a = 0, v = rotator.v;
		result.push({d, v, a});
		while(t--) {
			let label = `t: ${t} d/v/a: ${roundTo(3)(d)} / ${roundTo(3)(v)} / ${roundTo(3)(a)}`;
			//console.group(label);
			v = rotator(d);
			a = rotator.a;
			d -= v;
			//if(Math.abs(d) > Math.PI) d = PI2 - (d % PI2);
			result.push({d, v, a});
			console.log([d, v, a].map(roundTo(3)));
			//console.groupEnd(label);
		}
		return result;
	};
	const graphScenario = (rotator, graph, d, v, t = 0) => {
		const {maxA, maxV} = rotator;
		const scenarioLabel = `t = ${t}, d = ${roundTo(3)(d)}, v = ${roundTo(3)(v)}, maxA = ${roundTo(3)(maxA)}, maxV = ${roundTo(3)(maxV)}`;
		console.group(scenarioLabel);
		const data = evalScenario(d, t, rotator);
		const maxD = data.reduce((d, next) => Math.max(Math.abs(next.d), d), 0);
		data.forEach(({d, v, a}) => {
			let sd = calcStoppingDistance(v, maxA);
			graph.addDataPoint([
				(1 / maxD) * d,
				(1 / maxD) * sd,
				v * (1 / maxV),
				a * (1 / maxV),
				0, 0, 0, 0,
			].map(v=>v*1));
		});
		console.groupEnd(scenarioLabel);
	};

const createMainMenu = entities => {
	const cams = {
		board: {position: new Vector3(0, 10.6, 3.7), target: new Vector3(0, 0, 0.7), speed: 8},
		attackLeft: {position: new Vector3(-3.3, 2.9, 4.9), target: new Vector3(-0.5, -1.9, -4.6), speed: 14},
		attackRight: {position: new Vector3(3.3, 2.9, 4.9), target: new Vector3(0.5, -1.9, -4.6), speed: 14},
		drawOwn: {position: new Vector3(5.9, 4.7, 7.5), target: new Vector3(3.6, -2.3, -0.7), speed: 6},
	};
	const applyCam = (camName) => new Promise((resolve, reject) => {
		const orbitCam = entities.findComponent(OrbitCamComponent);
		const cam = cams[camName];
		orbitCam.slideCamera(cam.position, cam.target, cam.speed, resolve);
	});
	const delayP = delay => new Promise((resolve, reject) => setTimeout(resolve, delay));
	const getButton = label => entities.all.find(({button, text}) => button && text.value === label);
	const onButtonPress = (label, handler) => getButton(label).collider.addEventListener('mouseup', handler);
	const buttons = {
		'Flip Zone Display': ()=>{
			const zones = entities.queryComponents([CardZone]);
			zones.forEach(({zoneData}) => {
				if(zoneData.layout === 'grid') zoneData.layout = 'fan';
				else if(zoneData.layout === 'fan') zoneData.layout = 'grid';
			});
		},
		'Board Camera': ()=>applyCam('board'),
		'Left Camera': ()=>applyCam('attackLeft').then(delayP(1000)).then(()=>applyCam('board')),
		'Right Camera': ()=>applyCam('attackRight').then(delayP(1000)).then(()=>applyCam('board')),
		'Draw Camera': ()=>applyCam('drawOwn').then(delayP(1000)).then(()=>applyCam('board')),
	};
	const mainMenu = entities.createEntity({Transform: {position: {x: -8, y: 0, z: -5}}, Node: {}});
	Object.keys(buttons).forEach((label, idx) => {
		const button = entities.createEntity({Transform: {position: {x: 0, y: 0, z: idx * 0.7}}, Button: {label}});
		mainMenu.node.attach(button);
		button.collider.addEventListener('mouseup', buttons[label]);
	});
};

class CharacterMesh extends MeshComponent {
	OnAttachComponent(entity) {
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		geometry.translate(0, 0.5, 0);
		const material = new THREE.MeshPhongMaterial({ 
			color: 0xff0000, 
			//specular: 0x009900,
			shininess: 550, 
			emissive: 0xff0000,
			emissiveIntensity: 0.5,
			transparent: true,
			opacity: 0.8,
		});
		THREE.Mesh.call(this, geometry, material);
		super.OnAttachComponent(entity);
	}
}

class Ref {
	constructor() {
		this.id = undefined;
	}
	fromJSON(json) {
		this.id = json.id;
		return this;
	}
	toJSON() {
		return {id: this.id};
	}
}

class BoxMesh extends MeshComponent {
	OnAttachComponent(entity) {
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshPhongMaterial({
			color: 0xf5d061, 
			//specular: 0x009900,
			shininess: 550, 
			emissive: 0xe6af2e,
			emissiveIntensity: 0.5,
			transparent: true,
			opacity: 0.8
		});
		THREE.Mesh.call(this, geometry, material);
		super.OnAttachComponent(entity);
	}
}

class PointerMesh extends MeshComponent {
	OnAttachComponent(entity) {
		const geometry = new THREE.CylinderBufferGeometry(0, 0.5, 1, 16, 1);
		//coneGeometry.translate(0, -0.5, 0 );
		//const geometry = new THREE.BoxGeometry(1, 1, 1);
		geometry.translate(0, 0.5, 0);
		geometry.rotateX(0.5 * Math.PI);
		geometry.scale(0.2, 0.2, 0.2);
		const material = new THREE.MeshPhongMaterial({
			color: 0xf5d061, 
			//specular: 0x009900,
			shininess: 550, 
			emissive: 0xe6af2e,
			emissiveIntensity: 0.5,
			transparent: true,
			opacity: 0.8
		});
		THREE.Mesh.call(this, geometry, material);
		super.OnAttachComponent(entity);
	}
}

const TweenMax = require('TweenMax');
const TweenLite = require('TweenLite');
const {Sine, SlowMo, Power0, Power1, Power2, Power3, Power4} = TweenLite;

const playIdle = transform => {
	//console.info('playIdle(transform);', transform);
	const contract = () => new Promise((resolve, reject) => {
		TweenMax.fromTo(transform.scale, 1,
			{y: 1},
			{y: 0.9,
				ease: Power3.easeOut,
				onComplete: resolve
			}
		);
	});
	const expand = () => new Promise((resolve, reject) => {
		TweenMax.fromTo(transform.scale, 1.5,
			{y: 0.9},
			{y: 1,
				ease: Power1.easeOut,
				onComplete: resolve
			}
		);
	});
	return contract().then(()=>expand());
};
const playFaceTowards = target => {
	console.log(Power4.easeInOut.getRatio(0));
	console.log(Power4.easeInOut.getRatio(0.1));
	console.log(Power4.easeInOut.getRatio(0.49));
	console.log(Power4.easeInOut.getRatio(0.5));
	console.log(Power4.easeInOut.getRatio(0.51));
	console.log(Power4.easeInOut.getRatio(0.9));
	console.log(Power4.easeInOut.getRatio(1));
	return {
		setTarget: newTarget => {
			console.lgo('setTarget');
		},
		player: transform =>
			Promise.resolve()
			.then(() => {
				//transform.lookAt(target);
				const from = transform.quaternion.clone();
				const to = transform.quaternion.clone();
				const m = new THREE.Matrix4();
				m.lookAt(target, transform.position, transform.up);
				to.setFromRotationMatrix(m);

				return new Promise((resolve, reject) => {
					const props = {t: 0};
					TweenMax.fromTo(props, 1,
						{t: 0},
						{t: 1,
							ease: Power4.easeInOut,
							onUpdate: () => {
								//console.log(props.t);
								const to = transform.quaternion.clone();
								const m = new THREE.Matrix4();
								m.lookAt(target, transform.position, transform.up);
								to.setFromRotationMatrix(m);
								transform.quaternion.copy(from).slerp(to, props.t);
							},
							onComplete: resolve
						}
					);
				});
			})
	};
};

const faceTowards = target => transform =>
	Promise.resolve()
	.then(() => {
		//transform.lookAt(target);
		const from = transform.quaternion.clone();
		const to = transform.quaternion.clone();
		const m = new THREE.Matrix4();
		m.lookAt(target, transform.position, transform.up);
		to.setFromRotationMatrix(m);

		return new Promise((resolve, reject) => {
			const props = {t: 0};
			TweenMax.fromTo(props, 1,
				{t: 0},
				{t: 1,
					ease: Power4.easeInOut,
					onUpdate: () => {
						//console.log(props.t);
						const to = transform.quaternion.clone();
						const m = new THREE.Matrix4();
						m.lookAt(target, transform.position, transform.up);
						to.setFromRotationMatrix(m);
						transform.quaternion.copy(from).slerp(to, props.t);
					},
					onComplete: resolve
				}
			);
		});
	});

class CharacterAnimator {
	constructor() {
		this.mesh = undefined;
		this.looping = false;
	}
	OnAttachComponent(entity) {
	}
	play(animator, loop = false) {
		//console.info('CharacterAnimator.play(animator);');
		this.looping = loop;
		animator(this.mesh)
		.then(() => {
			if(this.looping)this.play(animator, true);
		});
	}
	fromJSON(json) {
		const refId = json.mesh.ref;
		this.mesh = this.entities.queryComponents([Ref]).find(({ref: {id}}) => id === refId).getComponent('Transform');
		return this;
	}
	toJSON() {

		return {mesh: {ref: this.mesh.entity.getComponent('Ref').id}};
	}
}

class GeometryComponent extends makeComponent(THREE.Geometry) {}

class MaterialComponent extends makeComponent(THREE.MeshPhongMaterial) {}

class PhongMaterial extends MaterialComponent {
	OnAttachComponent(entity) {
		//console.info('PhongMaterial.OnAttachComponent(entity);');
		THREE.MeshPhongMaterial.call(this, {
			color: 0xffffff,
			//specular: 0x009900,
			shininess: 550,
			emissive: 0xffffff,
			emissiveIntensity: 0.5,
			transparent: true,
			opacity: 0.95,
			/*
				color: 0xff0000, 
				//specular: 0x009900,
				shininess: 550, 
				emissive: 0xff0000,
				emissiveIntensity: 0.5,
				transparent: true,
				opacity: 0.8,
			*/
		});
		this.needsUpdate = true;
	}
	OnDetachComponent(entity) {
	}
	fromJSON(json) {
		//console.info('PhongMaterial.fromJSON(json);');
		const {
			color = this.color,
			shininess = this.shininess,
			emissive = this.emissive,
			emissiveIntensity = this.emissiveIntensity,
			transparent = this.transparent,
			opacity = this.opacity,
		} = json;
		/*
		console.log(JSON.stringify({
			color,
			shininess,
			emissive,
			emissiveIntensity,
			transparent,
			opacity
		}, null, '  '));
		*/
		this.color.copy(new THREE.Color(color));
		this.shininess = shininess;
		this.emissive.copy(new THREE.Color(emissive));
		this.emissiveIntensity = emissiveIntensity;
		this.transparent = transparent;
		this.opacity = opacity;
		this.needsUpdate = true;
		return this;
	}
	toJSON() {
		//console.info('PhongMaterial.toJSON();');
		const {
			color,
			shininess,
			emissive,
			emissiveIntensity,
			transparent,
			opacity,
		} = this;
		return {
			color: `#${color.getHexString()}`,
			shininess,
			emissive: `#${emissive.getHexString()}`,
			emissiveIntensity,
			transparent,
			opacity,
		};
	}
}

class BoxGeometry extends GeometryComponent {
	OnAttachComponent(entity) {
		//console.info('BoxGeometry.OnAttachComponent(entity);');
		THREE.BoxGeometry.call(this, 1, 1, 1);
	}
	OnDetachComponent(entity) {
	}
	fromJSON({position, scale} = {}) {
		return this;
	}
	toJSON() {
		return {
		};
	}
}

class GenericMeshComponent extends MeshComponent {
	OnAttachComponent(entity) {
		//console.info('GenericMeshComponent.OnAttachComponent(entity);');
		const geometry = entity.getComponent('GeometryComponent');
		const material = entity.getComponent('MaterialComponent');
		THREE.Mesh.call(this, geometry, material);
		//this.material.needsUpdate = true;
		super.OnAttachComponent(entity);
	}
}


const runTests = (accelFunc, graph, maxA, maxV) => {
	[
		//{d: 0, v: 0, t: 1},
		{d: 0.5 * maxV, v: 0, t: 4}, {d: 1.0 * maxV, v: 0, t: 5}, {d: 1.5 * maxV, v: 0, t: 12}, {d: 2.5 * maxV, v: 0, t: 14}, {d: 1 * Math.PI, v: 0, t: 20},
		//{d: 0, v:  1 * maxA, t: 6}, {d: 0, v: -1 * maxA, t: 10}, {d: 0, v:  1 * maxV, t: 15}, {d: 0, v: -1 * maxV, t: 15}, {d: 0, v:  10 * maxV, t: 15}, {d: 0, v:  -10 * maxV, t: 15},
		//{d: 1.0 * maxV, v: 0.5 * maxA, t: 10}, {d: 1.0 * maxV, v: 1.0 * maxA, t: 10}, {d: 1.0 * maxV, v: 1.5 * maxA, t: 10}, {d: 1.0 * maxV, v: 2.5 * maxA, t: 10}, {d: 1.0 * maxV, v: maxV, t: 20},
		//{d: 1.0 * maxV, v: -0.5 * maxA, t: 12}, {d: 1.0 * maxV, v: -1.0 * maxA, t: 12}, {d: 1.0 * maxV, v: -1.5 * maxA, t: 14}, {d: 1.0 * maxV, v: -2.5 * maxA, t: 16}, {d: 1.0 * maxV, v: -maxV, t: 15},
		//{d: 1.0 * maxV, v: -1.5 * maxA, t: 10},
		//{d: 1.0 * Math.PI, v: 0, t: 30}, {d: 1.0 * Math.PI, v: maxV, t: 30}, {d: 1.0 * Math.PI, v: -maxV, t: 30},
		//{d: 1.0 * Math.PI - 1 * maxV, v: -maxV, t: 500},
	].map(({d, v, t})=>{
		const rotator = makeRotatorFunc(accelFunc, maxA, maxV, v);
		graphScenario(rotator, graph, d, v, t);
	});
	graph.getRenderer()();
};

const init = () => {
	const entities = new EntityManager();
	entities.registerComponents([...Components,
		Ref, CharacterMesh, CharacterAnimator,
		BoxMesh, PointerMesh,
		GeometryComponent, MaterialComponent, MeshComponent,
		PhongMaterial, BoxGeometry, GenericMeshComponent,
		]);
	entities.createEntity(runtimeJson);

	const cams = {
		board: {position: new Vector3(0, 10.6, 3.7), target: new Vector3(0, 0, 0.7), speed: 8},
		closeUp: {position: new Vector3(0, 2.9, 4.9), target: new Vector3(0, 0, 0), speed: 14},
	};
	const applyCam = cam => new Promise((resolve, reject) => {
		const orbitCam = entities.findComponent(OrbitCamComponent);
		orbitCam.slideCamera(cam.position, cam.target, cam.speed, resolve);
	});
	applyCam(cams.closeUp);

	// Data
		const materialGoldJson = {
			color: 0xf5d061, 
			//specular: 0x009900,
			shininess: 550, 
			emissive: 0xe6af2e,
			emissiveIntensity: 0.5,
			transparent: true,
			opacity: 0.8,
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
		const materialWhiteJson = {
			color: 0xffffff,
			//specular: 0x009900,
			shininess: 550,
			emissive: 0xffffff,
			emissiveIntensity: 0.5,
			transparent: true,
			opacity: 0.95,
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
		const arrowJson = {
			Transform: {},
			Node: {children: [
				{Transform: {position: {x: 0, y: 0.1, z: 0.5}, scale: {x: 0.05, y: 0.05, z: 1}}, BoxMesh: {}},
				{Transform: {position: {x: 0, y: 0.1, z: 1}}, PointerMesh: {}},
			]}
		};
		const pointerJson ={
			Transform: {},
			Node: {children: [
				arrowJson,
			]},
			Collider: {},
			Editable: {}
		};
		const markerJson = {
			Transform: {},
			Node: {children: [
				//{Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 0.1, y: 0.1, z: 0.1}}, BoxMesh: {}},
				{
					Transform: {position: {x: 0, y: 0, z: 0}, scale: {x: 0.1, y: 0.1, z: 0.1}},
					PhongMaterial: materialGoldJson,
					BoxGeometry: {},
					GenericMeshComponent: {}
				},
			]},
			//Collider: {},
			Editable: {}
		};
	const character = entities.createEntity({
		Ref: {id: 'character_01'},
		Transform: {},
		Collider: {},
		Node: {children: [
			{
				Transform: {position: {x: 0, y: 0.5, z: 0}, scale: {x: 0.5, y: 0.5, z: 0.5}},
				PhongMaterial: materialRedJson,
				BoxGeometry: {},
				GenericMeshComponent: {}
			},
			{
				Ref: {id: 'red'},
				Transform: {position: {x: -0.5, y: 1, z: 0.5}, scale: {x: 0.2, y: 0.2, z: 0.2}},
				PhongMaterial: materialRedJson,
				BoxGeometry: {},
				GenericMeshComponent: {},
				Collider: {}
			},
			{
				Ref: {id: 'white'},
				Transform: {position: {x: 0.5, y: 1, z: 0.5}, scale: {x: 0.2, y: 0.2, z: 0.2}},
				PhongMaterial: materialWhiteJson,
				BoxGeometry: {},
				GenericMeshComponent: {},
				Collider: {}
			},
			{
				Transform: {position: {x: 0, y: 0.5, z: 0}},
				Node: {children: [arrowJson]}
			},
			{
				Transform: {position: {x: 0, y: 0.5, z: 0}, scale: {x: 1, y: 1, z: 1}},
				PhongMaterial: materialBlueJson,
				GeometryComponent: {},
				GenericMeshComponent: {}
			}
		]},
		CharacterAnimator: {mesh: {ref: 'character_01'}},
		Editable: {}
	});
	const characterMesh = character.node.children[0].entity;
	const characterPointer = character.node.children[3].entity;
	character.collider.setFromMesh(characterMesh.transform);
	character.collider.addEventListener('mouseup', event => {
		character.characterAnimator.play(playIdle, true);
	});
	const handleSetColor = event => {
		const materialJson = event.target.entity.getComponent('MaterialComponent').toJSON();
		characterMesh.getComponent('MaterialComponent').fromJSON(materialJson);
	};
	entities.queryComponents([Ref]).find(({ref: {id}}) => id === 'red').collider.addEventListener('mouseup', handleSetColor);
	entities.queryComponents([Ref]).find(({ref: {id}}) => id === 'white').collider.addEventListener('mouseup', handleSetColor);
	
	const line = new THREE.Line(new THREE.Geometry(), new THREE.LineBasicMaterial({color: 0xffffff}));
	const arc = character.node.children[4].entity;
	const setArc = (startA, endA) => {
		//console.info('setArc(%s, %s);', Math.round(startA * 180 / Math.PI), Math.round(endA * 180 / Math.PI));
		const curve = new THREE.EllipseCurve(0, 0, 1, 1, 0, 0, false, 0 * Math.PI);
		curve.aRotation = startA;
		curve.aStartAngle = (startA - startA + 2 * Math.PI) % (2 * Math.PI);
		curve.aEndAngle = (endA - startA + 2 * Math.PI) % (2 * Math.PI);
		curve.aClockwise = curve.aEndAngle > Math.PI;
		const arcPoints = curve.getSpacedPoints(8).map(({x, y}) => new Vector3(y, 0, x));
		line.geometry.vertices = arcPoints;
		line.geometry.verticesNeedUpdate = true;
		line.position.y = 1;
		character.transform.add(line);
		const geo = arc.geometryComponent;
		geo.vertices = [new Vector3(0, 0, 0)].concat(arcPoints);
		geo.faces = [];
		const [vb, vc] = curve.aClockwise?[-1, -0]:[-0, -1];
		for(var i = 1; i < arcPoints.length; i++) {
			geo.faces.push(new Face3(0, i - vb, i - vc));
		}
		geo.verticesNeedUpdate = true;
		geo.elementsNeedUpdate = true;
	};

	const handle = entities.findComponent('TransformHandle');
	const target = entities.createEntity(markerJson);
	const pointer = entities.createEntity(pointerJson);
	const updatePointer = () => {
		pointer.transform.position.copy(character.transform.position);
		pointer.transform.lookAt(target.transform.position);
		pointer.transform.updateMatrix();
	};

	target.transform.position.set(0, 0, 2);
	updatePointer();

	const graph = new DebugGraph();
	graph.graphSpacing = 3;

	class Navigator {
		constructor() {
			// transV, maxTV, maxTA
			// rotV, maxRV, maxRA
			// target
			// character
		}
	}

	
	const getRotAccel = (maxA) => (d, v) => {
		let a = 0;
		const sd = Math.sign(v) * calcStoppingDistance(v, maxA);
		if(Math.abs(d - v) <= maxA && Math.abs(v) <= maxA) {
			a = d - v;
			if(Math.abs(v + a) > maxA) {
				a = Math.sign(a) * (maxA - Math.abs(v));
			}
		} else if(d - (v + maxA) - sd >= 0) {
			a = maxA;
		} else if(d - (v - maxA) - sd >= 0) {
			a = -maxA;
		} else if(d - v - sd >= 0) {
			const tmp = d*d - 2*d*v - v*v;
			if(tmp < 0) console.error('d*d - 2*d*v - v*v < 0 at ', d, v);
			a = (1/2) * (-Math.sqrt(d*d - 2*d*v - v*v) + d - v);
		} else {
			a = -0.5 * Math.sign(v) * (v * v) * (1 / d);
		}
		return clamp(a, -maxA, maxA);
	};
	const maxTV = 1, maxTA = 1 / 1 * (1 / 60) * maxTV;
	let tv = 0;
	//const maxV = 0.015 * Math.PI, maxA = 0.0001 * Math.PI;
	const maxRV = 0.1 * Math.PI, maxRA = 1 / 1 * (1 / 60) * maxRV;
	//runTests(getRotAccel, graph, maxRA, maxRV); debugger;

	const rotator = makeRotatorFunc(getRotAccel, maxRA, maxRV, 0);
	const updatePointers = time => {
		const [start, end] = getAngles(character.transform, pointer.transform);
		let d = calcAngularDistance(start, end);
		character.transform.rotateY(rotator(d));
		const transD = character.transform.position.distanceTo(target.transform.position);
		if(transD > calcStoppingDistance(tv, maxTA) + 1) {
			tv = Math.min(maxTV, tv + maxTA);
		} else {
			tv = Math.max(0, tv - maxTA);
		}
		character.transform.translateZ(tv);
		updatePointer();
		let {v, a} = rotator;
		graph.addDataPoint([
			(1 / Math.PI) * d * 1,
			(1 / Math.PI) * calcStoppingDistance(v, maxRA) * 1,
			v * (1 / maxRV),
			a * (1 / maxRV),
			0, 0, 0, 0,
		]);
		graph.getRenderer()();
	};
	const updateArc = time => {
		const [startA, endA] = getAngles(character.transform, pointer.transform);
		setArc(0, endA - startA);
	};
	const runtime = entities.findComponent(Runtime);
	runtime.OnBeforeRender.push(updatePointers);
	runtime.OnBeforeRender.push(updateArc);

	handle.addEventListener('change', event => updatePointer());
	entities.findComponent(Environment)
		.floor.addEventListener('mousedown', event => {
			if(event.originalEvent.shiftKey) {
				const {point} = event.intersection;
				target.transform.position.copy(point);
				updatePointer();
			}
			if(event.originalEvent.altKey) {
				console.log('click');
			}
		});
	
	entities.findComponent(Runtime).start();
};


document.addEventListener('DOMContentLoaded', init);
	
})();