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
	target.transform.position.set(0.5, 0, 2);
	
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

	/*
		a = 1
		a = 0.5
		a = 0.1
		
		v = 0; sd = 0
		v = 1; sd = 1 / a;
		> 1, 0.9, 0.8

		sd = (v*v) / (2*a)

	*/
	const runtime = entities.findComponent(Runtime);

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const setCanvasSize =  event => {
		const {window: {innerWidth: width, innerHeight: height}} = this;
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
	const graphData = [];
	const graphSpacing = 1;
	const drawGraph = n => {
		if(graphData.length === 0) return;
		ctx.beginPath();
		//console.log((1 - graphData[0][n]) * (canvas.height * 0.5));
		ctx.moveTo(0, (1 - graphData[0][n]) * (canvas.height * 0.5));
		for(var x = 1; x < graphData.length; x++) {
			ctx.lineTo(x * graphSpacing, (1 - graphData[x][n]) * (canvas.height * 0.5));
			//console.log((1 - graphData[x][n]) * (canvas.height * 0.5));
		}
		ctx.stroke();
	};
	const renderGraph = time => {
		//console.log('renderGraph');
		const w = canvas.width / graphSpacing;
		if(graphData.length > w) graphData.splice(0, graphData.length - w);
		//console.log(graphData.map(d=>Math.round(d[2])).join(','));
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
		ctx.beginPath(); ctx.moveTo(0, canvas.height * 0.5); ctx.lineTo(canvas.width, canvas.height * 0.5); ctx.stroke();
		ctx.strokeStyle = 'rgba(255, 255, 255, 1)'; drawGraph(0);
		ctx.strokeStyle = 'rgba(127, 127, 127, 1)'; drawGraph(1);
		ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; drawGraph(2);
		ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'; drawGraph(3);
		ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; drawGraph(4);
	};

	var angV = 0, angA = 0;
	const maxV = 0.5 * Math.PI;
	const maxA = 0.001 * Math.PI;
	const axis = new Vector3(0, 1, 0);
	const PI2 = Math.PI * 2;
	const calcAngularDistance = (a, b) => {
		a = normalizeAngle(a);
		b = normalizeAngle(b);
		let d = normalizeAngle(b - a);
		if(d > Math.PI) d = -(PI2 - d);
		return d;
	};
	const calcStoppingDistance = (v, a) => (a === 0)?0:((v * v) / (2 * a));
	const calcStoppingAcceleration = (v, d) => (d === 0)?-v:((v * v) * (1 / Math.abs(d)) * 0.5);
	var cnt = 0;
	//for(var i = -400; i < 400; i += 31) {
		//console.log(i, normalizeAngle(i * Math.PI / 180) * 180 / Math.PI);
	//}

	const updatePointers = time => {
		cnt++;

		/*
			//if(sa >= angA) {
				//angV = Math.min(maxV, angV + angA * Math.sign(delta));
			//} else if(sa > 0) {
			//}
			angA = 0;
			if(Math.abs(d) >= Math.abs(sd)) {
				angA = maxA;
				//console.log('acc');
			} else {
				angA = -sa;
				//console.log('dec');
			}
		*/
		if(cnt % 1 === 0) {
			const [a, b] = getAngles(characterPointer.transform, pointer.transform);
			const d = calcAngularDistance(a, b);
			const sd = calcStoppingDistance(angV, maxA);
			const sd2 = calcStoppingDistance(angV-maxA * Math.sign(d), maxA);
			const sd3 = calcStoppingDistance(angV+maxA * Math.sign(d), maxA);
			const sa = calcStoppingAcceleration(angV, d);
			//const sd3 = calcStoppingDistance(angV, sa);
			let lvl = 0;
			if((Math.abs(d) <= maxA) && (Math.abs(angV) <= maxA)) {
				//angA = (angV + Math.abs(d)) * -Math.sign(d);
				angA = angV;
				angA += Math.abs(d);
				lvl = -0.9;
			} else {
				const d1 = d - 1 * angV;
				//const d2 = d1 + maxA * Math.sign(d);
				//const d3 = d1 - maxA * Math.sign(d);
				angA = Math.max(maxA, Math.abs(0.5 * angV));
				if(Math.abs(d1) <= sd) {
					angA *= -1;
					lvl = 0.4;
					/*
					if(calcStoppingDistance(angV + angA * Math.sign(d), maxA) < d1) {
						lvl = 0.8;
						angA = -sa;
					}
					*/
				}
				//else if(Math.abs(d3) <= sd) {
					//angA = sa * Math.sign(angV);
					//lvl = -0.8;
				//}
			}
			angA *= Math.sign(d);
			angV += angA;
			angV = Math.max(-maxV, Math.min(maxV, angV));
			graphData.push([
				(0.5 / Math.PI) * Math.abs(d) * 10 - 1,
				(0.5 / Math.PI) * sd * 10 - 1,
				//(0.5 / Math.PI) * sd1 * 10,
				//(0.5 / Math.PI) * sd2 * 10,
				//(0.5 / Math.PI) * sd3 * 10,
				//(0.5 / Math.PI) * d1 * 10,
				Math.abs(angV) * (1 / maxV) - 1,
				angA * (1 / maxV),
				//Math.sign(angV) * angA * (1 / maxA),
				//(0.5 / Math.PI) * (Math.abs(d) - sd) * 10,
				//sa * (1 / maxA),
				lvl,
				//(0.5 / Math.PI) * sa * 50,
				//(0.5 / Math.PI) * a,
				//(0.5 / Math.PI) * b,
				//(0.5 / Math.PI) * sdpos,
				//(0.5 / Math.PI) * sdneg,
				//(0.5 / Math.PI) * angV * 50,
				//(0.5 / Math.PI) * angA * 50,
				//(0.5 / Math.PI) * (Math.min(Math.abs(sa), Math.abs(maxA)) * Math.sign(angA)) * 50,
			]);
			const m = new THREE.Matrix4().makeRotationAxis(axis, angV);
			characterPointer.transform.applyMatrix(m);
			/*
			console.log([
				Math.round((180 / Math.PI) * d * 10) / 10,
				Math.round((180 / Math.PI) * sd * 10) / 10,
				Math.round((180 / Math.PI) * angV * 10) / 10,
			]);
			*/
			/*
			console.log([
				Math.round((180 / Math.PI) * d * 10) / 10,
				//Math.round((180 / Math.PI) * a * 10) / 10,
				//Math.round((180 / Math.PI) * b * 10) / 10,
				Math.round((180 / Math.PI) * sd * 10) / 10,
				//Math.round((180 / Math.PI) * sdpos * 10) / 10,
				//Math.round((180 / Math.PI) * sdneg * 10) / 10,
				Math.round((180 / Math.PI) * angV * 10) * 10,
				Math.round((180 / Math.PI) * angA * 10) * 10,
				//Math.abs(d) > Math.abs(sd),
				//(1000 / Math.PI) * angA,
				//(1000 / Math.PI) * angV,
				//(1000 / Math.PI) * sa,
				//(10 / Math.PI) * calcStoppingDistance(angV - angA, angA),
				//(10 / Math.PI) * calcStoppingDistance(angV + angA, angA)
			]);
			*/
			
		}
		

		/*
		//if(Math.abs(d) > Math.abs(sd))
		if(Math.sign(d) === Math.sign(delta)) {
			//console.log('acc', [d, sd, delta, angV].map(r=>Math.round(r * 180 / Math.PI * 100)/100).join(', '));
			angV = Math.min(maxV, angV + angA * Math.sign(delta));
			//graphData.push([d / Math.PI, angV * 10, angA * Math.sign(delta) * 100]);
		}
		else if(Math.sign(d) !== Math.sign(delta)) {
			//console.log('dec', [d, sd, delta, angV].map(r=>Math.round(r * 180 / Math.PI * 100)/100).join(', '));
			angV = angV - angA * Math.sign(angV);
		}
		else if(Math.abs(delta) <= Math.abs(sd)) {
			//angV -= angA * Math
		}
		*/
		//graphData.push([d / Math.PI * 10, sd / Math.PI * 10, (Math.sign(d) === Math.sign(delta))?0.5:-0.5]);
		//graphData.push([d / Math.PI * 10, sd / Math.PI * 10, delta]);
		/*
		console.log(
			Math.round(sd),
			Math.round(-(angV * angV))
			Math.round(-(angV * angV) / (2 * sd))
		);
		*/
		//console.log(-(angV * angV), (2 * sd), -(angV * angV) / (2 * sd) * 10);
		//console.log(graphData.map(d => d[2]));

		/*
		if(delta > Number.EPSILON) {
			//console.log('acc', [d, sd, delta, angV].map(r=>Math.round(r * 180 / Math.PI)));
			angV += angA * ((angV >= 0)?1:-1);
		} else if(Math.abs(angV) > Number.EPSILON) {
			//console.log('decc', [d, sd, delta, angV].map(r=>Math.round(r * 180 / Math.PI)));
			angV -= angA * ((angV >= 0)?1:-1);
		}
		*/
		//console.log([d, sd, delta, angV].map(r=>Math.round(r * 180 / Math.PI)));
		/*
		else if(Math.abs(delta) < 0.1) {
			angV -= angA * Math.sign(delta);
		}
		*/
	};

	runtime.OnBeforeRender.push(renderGraph);
	runtime.OnBeforeRender.push(updateArc);
	runtime.OnBeforeRender.push(updatePointers);

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