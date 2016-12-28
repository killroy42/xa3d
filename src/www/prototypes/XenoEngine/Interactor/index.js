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


class DebugGraph {
	constructor() {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const setCanvasSize = event => {
			const {innerWidth: width, innerHeight: height} = window;
			canvas.width = width;
			canvas.height = 400;
		};
		window.addEventListener('resize', setCanvasSize);
		setCanvasSize();
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		document.documentElement.appendChild(canvas);
		canvas.style.cssText = `
			position: absolute;
			top: 20px; left: 0;
			pointer-events: none;
		`;
		this.ctx = ctx;
		this.data = [];
		this.graphSpacing = 20;
	}
	addDataPoint(data) {
		this.data.push(data);
	}
	getRenderer() {
		return time => this.render(time);
	}
	drawGraph(n) {
		const {ctx, ctx: {canvas: {width, height}}, data, graphSpacing} = this;
		if(data.length === 0) return;
		ctx.beginPath();
		ctx.moveTo(0, (1 - data[0][n]) * (height * 0.5));
		for(var x = 1; x < data.length; x++) {
			ctx.lineTo(x * graphSpacing, (1 - data[x][n]) * (height * 0.5));
		}
		ctx.stroke();
	}
	render(time) {
		const {ctx, ctx: {canvas: {width, height}}, data, graphSpacing} = this;
		const w = width / graphSpacing;
		if(data.length > w) data.splice(0, data.length - w);
		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, width, height);
		ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
		ctx.beginPath(); ctx.moveTo(0, height * 0.5); ctx.lineTo(width, height * 0.5); ctx.stroke();
		ctx.strokeStyle = 'rgba(255, 255, 255, 1)'; this.drawGraph(0);
		ctx.strokeStyle = 'rgba(127, 127, 127, 1)'; this.drawGraph(1);
		ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; this.drawGraph(2);
		ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'; this.drawGraph(3);
		ctx.strokeStyle = 'rgba(0, 0, 255, 0.7)'; this.drawGraph(4);
		ctx.strokeStyle = 'rgba(255, 0, 255, 0.7)'; this.drawGraph(5);
		ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)'; this.drawGraph(6);
	}
}

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
	
	//const curve = new THREE.EllipseCurve(0, 0, 1, 1, 0, 0, false, 0.5 * Math.PI);
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

	//const faceTo = playFaceTowards(new Vector3());
	//character.characterAnimator.play(faceTo.player);

	const handle = entities.findComponent('TransformHandle');
	const target = entities.createEntity(markerJson);
	const target2 = entities.createEntity(markerJson);

	target2.transform.position.set(0, 0, 2);
	target.transform.position.set(0, 0, 2);
	
	const pointer = entities.createEntity(pointerJson);
	
	const normalizeAngle = a => ((a >= 0)?a:PI2 - ((-a) % PI2)) % PI2;
	const getAngles = (ta, tb) => {
		const m = new THREE.Matrix4();
		const v0 = new THREE.Vector3(0, 0, 1);
		const v1 = new THREE.Vector3(0, 0, 1);
		const v2 = new THREE.Vector3(0, 0, 1);
		v1.transformDirection(m.makeRotationFromQuaternion(ta.quaternion));
		v1.y = 0;
		v2.transformDirection(m.makeRotationFromQuaternion(tb.quaternion));
		v2.y = 0;
		var a = v0.angleTo(v1);
		var b = v0.angleTo(v2);
		//console.log(Math.sign(v0.z), Math.sign(v1.z), Math.sign(v2.z));
		if(Math.sign(v1.x) < 0) a *= -1;
		if(Math.sign(v2.x) < 0) b *= -1;
		return [normalizeAngle(a), normalizeAngle(b)];
	};

	const updatePointer = () => {
		pointer.transform.position.copy(character.transform.position);
		pointer.transform.lookAt(target.transform.position);
		pointer.transform.updateMatrix();
		//characterPointer.transform.lookAt(target2.transform.position);
	};
	//character.transform.lookAt(new Vector3(1, 0, -1));
	updatePointer();

	target.collider.addEventListener('mouseup', event => {
	});

	const updateArc = time => {
		const [startA, endA] = getAngles(characterPointer.transform, pointer.transform);
		setArc(startA, endA);
	};
	const runtime = entities.findComponent(Runtime);

	const graph = new DebugGraph();

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
	//const signA = (d, v) => (Math.sign(d) !== 0)?Math.sign(d):Math.sign(v);
	//const signV = (d, v) => (Math.sign(v) !== 0)?Math.sign(v):Math.sign(d);

	const roundTo = (roundTo = 2) => n => Math.round((0.5 / Math.PI) * n * Math.pow(10, roundTo)) / Math.pow(10, roundTo);
	const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

	let v = 0;
	const maxV = 0.015 * Math.PI, maxA = 0.01 * Math.PI;
	//const maxV = 0.1 * Math.PI, maxA = 0.01 * Math.PI;
	const axis = new Vector3(0, 1, 0);
	const PI2 = Math.PI * 2;
	const updatePointers = time => {
		/*
			sd = stopping distance = v^2/(2*a)
			d = vt + (1/2)at^2 

			deceleration = (final velocity - initial velocity) / time
			d = (vf - vi)/t

			d = deceleration
			vf = final velocity
			vi = initial velocity
			t = time
			To Stop:
			 0 = 2 a d
			 -u² = 2 a d
			 (-u²)/2 = a d
			 0.5 * u² * 1/d = decel
		*/
		const calcAccel = (v, a) => clamp(v + a, -maxV, maxV);
		const dOverTime = (d, v, a, t = 0) => {
			if(t <= 0) return d;
			v = calcAccel(v, a);
			d -= v;
			return dOverTime(d, v, a, --t);
		};
		let sig = 0, a = 0, sign = 1;
		const [start, end] = getAngles(characterPointer.transform, pointer.transform);
		let d = calcAngularDistance(start, end);
		if(d < 0) sign = -1;
		d *= sign;
		v *= sign;
		const getA1 = (d, v) => {
			const sd = calcStoppingDistance(v, maxA);
			const sa = (v * v) * (1 / Math.abs(d)) * 0.5;
			const accelOpts = [
				{f: '0', a: 0},
				{f: 'maxA', a: maxA},
				{f: 'sa', a: isNaN(sa)?maxA:sa},
				{f: 'd - v', a: d - v},
			];
			const accelErr = [].concat(
				accelOpts.map((a, idx)=>Object.assign({}, a, {idx, sign:  1, iter: 1})),
				accelOpts.map((a, idx)=>Object.assign({}, a, {idx, sign: -1, iter: 1}))
				//accelOpts.map((a, idx)=>Object.assign({}, a, {idx, sign:  1, iter: 2})),
				//accelOpts.map((a, idx)=>Object.assign({}, a, {idx, sign: -1, iter: 2}))
			).map(opt=> {
				const a = clamp(opt.sign * opt.a, -maxA, maxA);
				const errV = Math.abs(v) / maxV;
				const errD = Math.abs(Math.abs(dOverTime(d, v, a, opt.iter)) - sd) / Math.PI;
				return Object.assign(opt, {a, errD, errV, err: 0.5 * (errV + errD)});
			});
			const min = accelErr.reduce((acc, curr) => (curr.err < acc.err)?curr:acc, {err: Number.POSITIVE_INFINITY});
			sig = min.idx * min.sign * min.iter * (1/6);
			return min.a;
		};
		const getA2 = (d, v) => {
			console.log('d, v:', d, v, dOverTime(d, v, 0, 0));
			return 0;
		};
		a = getA2(d, v);
		//console.log(accelErr.map(({err})=>err).map(roundTo(4)).join(', '));
		//console.log('%s * (%s)', min.f, min.sign, min.iter, sig);
		/*
			const err1a = Math.abs(dOverTime(d, v, maxA, 1) - sd) + Math.abs(v);
			const err1n = Math.abs(dOverTime(d, v, -v + d, 1) - sd) + Math.abs(v);
			const err1d = Math.abs(dOverTime(d, v, -Math.min(maxA, sa, -v + d), 1) - sd) + Math.abs(v);
			const err2a = Math.abs(dOverTime(d, v, maxA, 2) - sd) + Math.abs(v);
			const err2n = Math.abs(dOverTime(d, v, -v + d, 2) - sd) + Math.abs(v);
			const err2d = Math.abs(dOverTime(d, v, -Math.min(maxA, sa, -v + d), 2) - sd) + Math.abs(v);

			const minErr = Math.min(err1a, err1n, err1d, err2a, err2n, err2d);
			//const minErr = Math.min(err1a, err1d);
			switch(minErr) {
				case err1a: console.log('err1a'); sig = 0.5; a = maxA; break;
				case err1n: console.log('err1n'); sig = 0.1; a = -v + d; break;
				case err1d: console.log('err1d'); sig = -0.5; a = -Math.min(maxA, Math.max(sa, -v + d)); break;
				case err2a: console.log('err2a'); sig = 0.9; a = maxA; break;
				case err2n: console.log('err2n'); sig = 0.2; a = -v + d; break;
				case err2d: console.log('err2d'); sig = -0.9; a = -Math.min(maxA, Math.max(sa, -v + d)); break;
				default: console.log('default'); sig = 0;
			}
		*/
		/*
			if(dOverTime(d, v, 0, 1) <= maxA && Math.abs(v) <= maxA) {
				// Almost there!
				a = -v + d;
				sig = 0.1;
			} else if(err2a < err2d) { // accel better than decel
				a = maxA;
				sig = 0.5;
			} else if(err2a > err2d) { // decel better than accel
				sig = -0.5;
				a = -maxA;
			} else {
				sig = 0;
			}
			//a *= signV(d, v);
		*/
		/*
			if(err1a < err1d) {
				sig = 0.5;
				angA = maxA;
			} else if(err1a > err1d) {
				if(sa === 0) {
					angA = -maxA;
					sig = -0.9;
				} else {
					sig = -0.5;
					angA = -Math.min(maxA, Math.abs(sa));
					//console.log(angA);
				}
			} else {
				if(Math.abs(d) <= maxA) {
					sig = 0;
				} else {
					sig = -0.1;
					angA = -Math.min(maxA, Math.abs(sa));
				}
			}
		*/
		/*
			if(Math.abs(d1a) < Math.abs(d1d)) {
				const d2a = calcDUnderAccel(d, angV, 2);
				const d2d = calcDUnderDecel(d, angV, 2);
				if(Math.abs(d2a) < Math.abs(d2d)) {
					sig = 0.9;
					angA = maxA;
				} else if(Math.abs(d2a) > Math.abs(d2d)) {
					sig = 0.1;
				} else {
					sig = 0.5;
				}
				
				if(Math.abs(calcDUnderAccel(d, angV, 2)) > sd) {
					sig = 0.8;
					angA = maxA;
					//} else if(Math.abs(calcDUnderDecel(d, angV, 2)) > sd) {
				} else {
					sig = 0.4;
					angA = -Math.min(maxA, sa);
				}
				
			} else if(Math.abs(d1a) > Math.abs(d1d)) {
				sig = -0.5;
				//angA = -maxA;
				angA = -Math.min(maxA, sa);
			} else {
				sig = 0;
			}
		*/
		/* PLAUSIBLE SOLUTION!!!
			if(Math.abs(d) <= maxA && Math.abs(angV) <= maxA) {
				sig = 0.5;
				angA = -Math.min(maxA, Math.abs(d - angV));
				if(!isNaN(sa)) angA = -Math.min(sa, maxA);
			} else if(Math.abs(d - calcD(angV, -maxA, 3)) <= sd) {
				sig = -0.2;
				angA = -Math.min(maxA, sa);
			} else if(Math.abs(d - calcD(angV, -maxA, 2)) <= sd) {
				sig = -0.4;
				angA = -Math.min(maxA, sa);
			} else if(Math.abs(d - calcD(angV, -maxA, 1)) <= sd) {
				sig = -0.6;
				angA = -maxA;
			} else if(Math.abs(d - calcD(angV, -maxA, 0)) <= sd) {
				sig = -0.8;
				angA = -maxA;
			} else if(Math.abs(d - calcD(angV, maxA, 0)) <= sd) {
				sig = -0.8;
				angA = -maxA;
			} else if(Math.abs(d - calcD(angV, maxA, 1)) <= sd) {
				sig = -0.6;
				angA = -Math.min(maxA, sa);
			} else if(Math.abs(d - calcD(angV, maxA, 2)) <= sd) {
				sig = -0.4;
				angA = -Math.min(maxA, sa);
			} else if(Math.abs(d - calcD(angV, maxA, 3)) <= sd) {
				sig = 0.7;
				angA = maxA;
			} else if(Math.abs(d) <= sd) {
				sig = 0.7;
				angA = maxA;
			} else if(Math.abs(d - angV) <= maxA && (Math.abs(angV) - maxA) <= maxA) {
				sig = -0.9;
				angA = -Math.min(maxA, sa);
			} else if(Math.abs(d - angV) <= maxA && Math.abs(angV - maxA) <= maxA) {
				sig = -0.8;
				angA = -Math.min(maxA, sa);
			} else if(Math.abs(d) <= maxA) {
				sig = -0.5;
				angA = -maxA;
			} else {
				sig = 1;
				angA = maxA;
			}
		*/
		/* NOTES
			//if(Math.abs(d - calcD(angV, maxA, 3)) <= sd) { sig = -0.8; angA = -maxA; }
			//if(Math.abs(d - Math.sign(angV) * calcD(Math.abs(angV), -maxA, 0)) <= sd) { sig = -0.2; angA = -Math.min(maxA, sa); }
			//if(Math.abs(d - Math.sign(angV) * calcD(Math.abs(angV), -maxA, 1)) <= sd) { sig = -0.4; angA = -Math.min(maxA, sa); }
			//if(Math.abs(d - Math.sign(angV) * calcD(Math.abs(angV), -maxA, 2)) <= sd) { sig = -0.6; angA = -maxA; }
			//if(Math.abs(d - Math.sign(angV) * calcD(Math.abs(angV), maxA, 3)) >= sd) { sig = 1; angA = maxA; }
			//if(Math.abs(d - Math.sign(angV) * calcD(Math.abs(angV), maxA, 2)) >= sd) { sig = 0.8; angA = maxA; }
			//if(Math.abs(d - Math.sign(angV) * calcD(Math.abs(angV), maxA, 1)) >= sd) { sig = 0.6; angA = maxA; }
			//if(Math.abs(d - Math.sign(angV) * calcD(Math.abs(angV), maxA, 0)) >= sd) { sig = 0.4; angA = maxA; }

			//if(Math.abs(d - angV) <= 0 && angV <= angA) sig = 0;
		
			} else if(Math.abs(d - calcD(angV, maxA, 0)) >= sd) {
				sig = 0.2;
				angA = maxA;
				//angA = -Math.min(maxA, sa);
			} else if(Math.abs(d - calcD(angV, maxA, 2)) >= sd) {
				if(Math.abs(angV) <= maxA) {
					sig = 0.9;
					angA = maxA;
				} else {
					sig = 0.7;
					angA = maxA;
					//angA = Math.min(maxA, sa);
				}
			} else if(Math.abs(d - calcD(angV, -maxA, 3)) >= sd) {
				sig = -0.2;
				angA = maxA;
			} else if(Math.abs(d - calcD(angV, -maxA, 2)) >= sd) {
				sig = -0.4;
				angA = maxA;
			} else if(Math.abs(d - calcD(angV, -maxA, 1)) >= sd) {
				sig = -0.4;
				angA = maxA;
			} else if(Math.abs(d - calcD(angV, maxA, 4)) >= sd) {
				sig = -0.3;
				angA = -maxA;
			} else if(Math.abs(d - calcD(angV, maxA, 3)) >= sd) {
				sig = 0.1;
				angA = maxA;
				//angA = -Math.min(maxA, sa);
			else if(Math.abs(d - calcDist(angV, maxV, maxA, 3)) >= sd) {
				sig = 0.2;
				//angA = maxA;
				//angA = -Math.min(maxA, sa);
			}
			else if(Math.abs(d - calcDist(angV, maxV, maxA, 2)) >= sd) {
				sig = 0.4;
				angA = maxA;
			}
			else if(Math.abs(d - calcDist(angV, maxV, maxA, 1)) >= sd) {
				sig = 0.6;
				angA = maxA;
			}
			else if(Math.abs(d - calcDist(angV, maxV, maxA, 0)) >= sd) {
				sig = 0.8;
				angA = -Math.min(maxA, sa);
			}
			else if(Math.abs(d + (Math.sign(angV) * Math.min(maxV, Math.abs(angV) - maxA))) >= sd) {
			//else if(Math.abs(d - (Math.sign(angV) * Math.min(maxV, Math.abs(angV)))) >= sd) {
				sig = 0.2;
				angA = -maxA;
			}
			else if(Math.abs(d + (Math.sign(angV) * Math.min(maxV, Math.abs(angV) - maxA))) >= sd) {
			//else if(Math.abs(d - (Math.sign(angV) * Math.min(maxV, Math.abs(angV)))) >= sd) {
				sig = 0.2;
				angA = -maxA;
			}
			else if(Math.abs(d - (Math.sign(angV) * Math.min(maxV, Math.abs(angV) - maxA))) >= sd) {
				sig = 0.7;
				angA = -maxA;
			}
			} else {
				sig = -0.9;
				//angA = -maxA;
				angA = -Math.min(maxA, sa);
			}
			//if(false) {}
			//else if(Math.abs(d - angV) < maxA && angV <= maxA) sig = -0.9;
			//else if(Math.abs(d - (2 * angV)) > sd) sig = 0.9;
			//else if(Math.abs(d - (angV)) > sd) sig = 0.6;
			//else if(Math.abs(d) > sd) sig = 0.2;
			console.log([
				Math.abs(d),
				sd,
				Math.abs(d) <= sd
			]);
			if(Math.abs(d - (angV + angA * Math.sign(d))) <= sd) {
				//angA = sa;
				angA = maxA;
			}
			else
			if((Math.abs(d) <= maxA) && (Math.abs(angV) <= maxA)) {
				//angA = angV + Math.abs(d);
				angA = sa;
				//angA = maxA * 2;
			}
			else {
				angA = maxA;//Math.max(maxA, Math.abs(0.5 * angV));
			}
			angA *= Math.sign(d);
		*/
		//angA *= (Math.sign(d) !== 0)?Math.sign(d):Math.sign(angV);
		//angA = Math.max(-maxA, Math.min(maxA, angA));
		//angA = clampA(accelSign(d, angV), angA);
		//angV += angA;
		const v0 = v;
		v = sign * calcAccel(v, a);
		const sd = calcStoppingDistance(v, maxA);
		graph.addDataPoint([
			(0.5 / Math.PI) * d * 10,
			//(0.5 / Math.PI) * sd * 10,
			//(0.5 / Math.PI) * Math.sign(d) * (Math.abs(d) - sd) * 20,
			v * (1 / maxV),
			a * (1 / maxV),
			0, 0,
			//v0 - d, -v0 + d,
			//(0.5 / Math.PI) * err2a * 20, (0.5 / Math.PI) * err2d * 20,
			//min.errD,
			//min.errV,
			//(0.5 / Math.PI) * err1a * 20,
			//(0.5 / Math.PI) * err1d * 20,
			//Math.sign(angA) * Math.min(maxA, Math.abs(sa)) * (1 / maxV),
			//(0.5 / Math.PI) * Math.sign(d) * err1a * 20,
			//(0.5 / Math.PI) * Math.sign(d) * err1d * 20,
			sig,
		]);
		const m = new THREE.Matrix4().makeRotationAxis(axis, v);
		characterPointer.transform.applyMatrix(m);
	};


	const accelFun01 = (maxA) => (d, v) => {
		let a = 0;
		const sd = Math.sign(v) * calcStoppingDistance(v, maxA);
		if(Math.abs(d - v) <= maxA && Math.abs(v) <= maxA) {
			console.log('A');
			a = d - v;
			if(Math.abs(v + a) > maxA) {
				a = Math.sign(a) * (maxA - Math.abs(v));
			}
		//} else if(d - (v + maxA) - (v + 2 * maxA) - sd >= 0) {
			//console.log('B');
			//a = maxA;
		} else if(d - (v + maxA) - sd >= 0) {
			console.log('B');
			a = maxA;
		} else if(d - (v - maxA) - sd >= 0) {
			console.log('B.1');
			a = -maxA;
		} else if(d - v - sd >= 0) {
			console.log('C');
			a = (1/2) * (-Math.sqrt(d*d - 2*d*v - v*v) + d - v);
		} else {
			console.log('D');
			a = -0.5 * Math.sign(v) * (v * v) * (1 / d);
		}
		return clamp(a, -maxA, maxA);
	};

	const updatePointers2 = f => time => {
		const [start, end] = getAngles(characterPointer.transform, pointer.transform);
		let d = calcAngularDistance(start, end);
		let sign = (d < 0)?-1:1;
		d = sign * (sign * d) % (2 * Math.PI);
		let a = f(d * sign, v * sign) * sign;
		v = clamp(v + a, -maxV, maxV);
		if(d > Math.PI) {
			d = (2 * Math.PI) - (d % (2 * Math.PI));
			v = -v;
			a = -a;
		}
		const m = new THREE.Matrix4().makeRotationAxis(axis, v);
		characterPointer.transform.applyMatrix(m);
		graph.addDataPoint([
			(1 / Math.PI) * d * 1,
			(1 / Math.PI) * calcStoppingDistance(v, maxA) * 1,
			v * (1 / maxV),
			a * (1 / maxV),
			0, 0, 0, 0,
		]);
		graph.getRenderer()();
	};

	const evalScenario = (d, v, t, f) => {
		const result = [];
		let a = 0, sign = 1;
		v = clamp(v, -maxV, maxV);
		result.push({d, v, a});
		while(t--) {
			let label = `t: ${t} d/v/a: ${d} / ${v} / ${a}`;
			console.group(label);
			//console.log(d, v, a);
			sign = (d < 0)?-1:1;
			a = clamp(f(d * sign, v * sign), -maxA, maxA) * sign;
			console.log('a:', a);
			v = clamp(v + a, -maxV, maxV);
			console.log('v:', v);
			d -= v;
			if(d > Math.PI) {
				d = (2 * Math.PI) - (d % (2 * Math.PI));
				//d = 2 * Math.PI - d;
				v = -v;
				a = -a;
			}
			result.push({d, v, a});
			console.log({d, v, a});
			console.groupEnd(label);
		}
		return result;
	};
	const graphScenario = (d, v, t = 0) => {
		const scenarioLabel = `d = ${d}, v = ${v}, t = ${t}`;
		console.group(scenarioLabel);
		const res01 = evalScenario(d, v, t, accelFun01(maxA));
		const maxD = res01.reduce((d, next) => (d < next.d)?next.d:d, 0);
		for(var i = 0; i < res01.length; i++) {
			let {d, v, a} = res01[i];
			let sd = calcStoppingDistance(v, maxA);
			//console.log(d, v, a, maxD);
			graph.addDataPoint([
				(1 / Math.PI) * d * (1 / maxD),
				(1 / Math.PI) * sd * (1 / maxD),
				v * (1 / maxV),
				a * (1 / maxV),
				0, 0, 0, 0,
			].map(v=>v*1));
		}
		console.groupEnd(scenarioLabel);
	};

	[
		//{d: 0, v: 0, t: 1},
		//{d: 0.5 * maxV, v: 0, t: 4}, {d: 1.0 * maxV, v: 0, t: 5}, {d: 1.5 * maxV, v: 0, t: 12}, {d: 2.5 * maxV, v: 0, t: 14}, {d: 1 * Math.PI, v: 0, t: 20},
		//{d: 0, v:  1 * maxA, t: 6}, {d: 0, v: -1 * maxA, t: 10}, {d: 0, v:  1 * maxV, t: 15}, {d: 0, v: -1 * maxV, t: 15}, {d: 0, v:  10 * maxV, t: 15}, {d: 0, v:  -10 * maxV, t: 15},
		{d: 1.0 * maxV, v: 0.5 * maxA, t: 10}, {d: 1.0 * maxV, v: 1.0 * maxA, t: 10}, {d: 1.0 * maxV, v: 1.5 * maxA, t: 10}, {d: 1.0 * maxV, v: 2.5 * maxA, t: 10}, {d: 1.0 * maxV, v: maxV, t: 30},
		//{d: 1.0 * maxV, v: -0.5 * maxA, t: 12}, {d: 1.0 * maxV, v: -1.0 * maxA, t: 12}, {d: 1.0 * maxV, v: -1.5 * maxA, t: 14}, {d: 1.0 * maxV, v: -2.5 * maxA, t: 16}, {d: 1.0 * maxV, v: -maxV, t: 15},
		//{d: 1.0 * maxV, v: -1.5 * maxA, t: 10},
		//{d: 1.0 * Math.PI, v: 0, t: 30}, {d: 1.0 * Math.PI, v: maxV, t: 30}, {d: 1.0 * Math.PI, v: -maxV, t: 30},
		//{d: 1.0 * Math.PI - 1 * maxV, v: -maxV, t: 30},
	].map(({d, v, t})=>graphScenario(d, v, t));

	/*
		const tests = [
			{offset: 0, v: 0},
			{offset: 0.7, v: 0}, {offset: -0.7, v: 0},
			{offset: 0.7, v: 0.3}, {offset: -0.7, v: -0.3},
			{offset: 0.7, v: -0.3}, {offset: -0.7, v: 0.3},
			{offset: 0.7, v: 0.7}, {offset: -0.7, v: -0.7},
			{offset: 0.7, v: -1}, {offset: -0.7, v: 1},
			{offset: Math.random() * 2, v: Math.random() * 2 -1},
			{offset: 0, v: maxV},
			{offset: maxV, v: 0},
		];
		let test, t, testLen = 20;
		//runTest(tests[1], testLen); runTest(tests[0], 2); runTest(tests[2], testLen); runTest(tests[0], 2);
		//runTest(tests[3], testLen); runTest(tests[0], 2); runTest(tests[4], testLen); runTest(tests[0], 2);
		//runTest(tests[5], testLen); //runTest(tests[0], 2); runTest(tests[6], testLen); runTest(tests[0], 2);
		//runTest(tests[7], testLen); runTest(tests[0], 2); runTest(tests[8], testLen); runTest(tests[0], 2);
		//runTest(tests[7], 20); runTest(tests[8], 20);
		//runTest(tests[9], 20); runTest(tests[10], 20);
		//runTest(tests[0], 5);
	*/
	graph.getRenderer()();
	
	debugger;
	runtime.OnBeforeRender.push(updatePointers2(accelFun01(maxA)));
	runtime.OnBeforeRender.push(updateArc);

	//runtime.OnBeforeRender.push(updatePointers);
	/*
	setTimeout(() => {
		runtime.OnBeforeRender.push(updatePointers);
		setTimeout(() => {
			target.transform.position.set(test.offset, 0, 2);
			updatePointer();
			v = test.v * maxV;
			setTimeout(() => {
				debugger;
			}, (1000 / 60) * 80);
		}, (1000 / 60) * 5);
	}, (1000 / 60) * 5);
	*/

	//runtime.OnBeforeRender.push(graph.getRenderer());
	//runtime.OnBeforeRender.push(updateArc);

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