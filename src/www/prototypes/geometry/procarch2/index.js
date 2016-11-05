 (function() {
const THREE = require('THREE');
const enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
const THREEPrototype = require('THREEPrototype');
const MouseHandler = require('MouseHandler');
const MouseCursor = require('MouseCursor');
const GeometryHelpers = require('GeometryHelpers');
const initLights = require('initLights');
const createRng = require('portable-rng');
const PoolManager = require('PoolManager');
const DatGui = require('dat').GUI;
const {merge} = require('_');
const FPSControls = require('FPSControls');
const {colors} = require('assetdata');
const {
	FlatShading,
	Vector3, Matrix4,
	CurvePath,
	LineCurve3,
	CubicBezierCurve3,
	QuadraticBezierCurve3,
	CatmullRomCurve3,
	Color,
	MeshPhongMaterial, LineBasicMaterial,
	Shape, Geometry, ExtrudeGeometry, PlaneGeometry, BoxGeometry,
	Object3D, Mesh, Line,
	BoxHelper, GridHelper,
} = require('THREE');
const TweenLite = require('TweenLite');
const {Sine, Power1, Power2, Power3, Power4} = TweenLite;
const TweenMax  = require('TweenMax');
const TimelineMax = require('TimelineMax');
const {Entity, Component, System, EntityManager} = require('XenoECS');
const {Transform, SceneComponent, Collider, App} = require('components');
const {Selectable} = require('ecsSelectable');
const {KeyHandler, GuiControl, ControlHandle} = require('ecsGuiCore');
const {makeProfile, makeShapeFromProfile, makeExtrudedProfile} = require('basicGenerators');
const {Corridor} = require('ecsCorridor');
const ConstructionKit = require('ConstructionKit');
const make = ConstructionKit.make;


const flatMaterial = (args) => make('makeFlatMaterial', args);
const wallMat = flatMaterial({color: colors.BlueGrey200});
const ceilingMat = flatMaterial({color: colors.Teal200});
const floorMat = flatMaterial({color: colors.Teal900});
const bulkheadMat = flatMaterial({color: colors.BlueGrey900});
const corridorOpts = {
	wall: {seed: 2, segments: 7, depth: 0.3, material: wallMat},
	ceiling: {seed: 0, segments: 7, depth: 0.2, material: ceilingMat},
	floor: {seed: 1, segments: 7, depth: 0.1, material: floorMat},
	bulkhead: {
		depth: 0.1,
		material: bulkheadMat,
		bevel: {
			amount: 0.2,
			bevelThickness: 0.1,
			bevelSize: 0.1,
			bevelSegments: 1
		}
	},
	width: 2, height: 3, length: 1,
};

const makeFlatMaterial = ({color}) => new MeshPhongMaterial({color, shading: FlatShading});

const createButton = ({label, left, top, onClick}) => {
	const element = document.createElement('div');
	document.body.appendChild(element);
	element.innerHTML = label;
	element.style.cssText = `
		position: absolute;
		width: auto; height: 1em;
		margin: 0.2em;
		padding: 0.2em 0.4em;
		font: bold 1.5em Arial;
		line-height: 1em;
		text-align: center;
		left: ${left}; top: ${top};
		border: 2px solid white;
		border-radius: 0.2em;
		color: white;
		background: rgba(0,0,0,1);
		opacity: 0.3;
		cursor: pointer;
	`;
	element.addEventListener('mouseenter', () => element.style.opacity = 1);
	element.addEventListener('mouseleave', () => element.style.opacity = 0.3);
	element.addEventListener('click', onClick);
};

class GeneratorContext {
	constructor() {
		this._objectPool = new PoolManager();
		this._aquisitions = {};
		this._tracking = undefined;
	}
	createRng(seed) {
		return createRng(seed);
	}
	track(label) {
		this._tracking = label;
	}
	aquire(T) {
		const {_objectPool, _aquisitions, _tracking} = this;
		const object = _objectPool.aquire(T);
		if(_tracking !== undefined) {
			if(_aquisitions[_tracking] === undefined) _aquisitions[_tracking] = [];
			_aquisitions[_tracking].push(object);
		}
		return object;
	}
	release(label) {
		const {_objectPool, _aquisitions, _tracking} = this;
		const releaseList = _aquisitions[label];
		var i = releaseList.length; while(i--) _objectPool.release(releaseList[i]);
		releaseList.length = 0;
	}
}

function testConstructionKit(app) {
	const {scene, camera, em} = app;
	const root = new THREE.Object3D();
	root.position.set(0, 1, 0);
	scene.add(root);
	const constructionKit = new ConstructionKit();
	const register = (...args) => constructionKit.register(...args);
	const construct = (...args) => constructionKit.construct(...args);
	const context = new GeneratorContext();
	const contructFlatMaterial = constructionKit.register('makeFlatMaterial', makeFlatMaterial, context);

	const corridorGenerators = require('corridorGenerators');
	Object.keys(corridorGenerators).forEach((name) =>
		constructionKit.register(name, corridorGenerators[name], context));
	const {makeBulkhead, makeCorridor} = require('corridorGenerators');
	const constructCorridor = constructionKit.register('makeCorridor', makeCorridor, context);
	const constructBulkhead = constructionKit.register('makeBulkhead', makeBulkhead, context);

	const createCorridorInteractive = (opts) => {
		const entity = em.createEntity([Transform, Collider, ControlHandle, Selectable, Corridor]);
		const {transform, collider, corridor} = entity;
		collider.object3d.material.opacity = 0;
		transform.addTo(scene);
		corridor.build(constructCorridor, opts);
		return entity;
	};

	// Bulkheads
		/*
		const bulkheadFront = constructBulkhead(opts);
		bulkheadFront.position.z = -0.5 * opts.length;
		root.add(bulkheadFront);
		const bulkheadBack = constructBulkhead(opts);
		bulkheadBack.position.z = 0.5 * opts.length;
		root.add(bulkheadBack);
		*/	
	const createCorridor = () => {
		const entity = em.createEntity([Transform, Corridor]);
		entity.transform.addTo(scene);
		entity.corridor.setConstructionKit(constructionKit);
		entity.corridor.setOpts(corridorOpts);
		entity.corridor.constructCorridor = constructCorridor;
		return entity.corridor;
	};
	const corridor = createCorridor();
	const plane = new Mesh(new PlaneGeometry(1000, 1000, 1, 1), new MeshPhongMaterial({color: 0xff00ff}));
	plane.name = 'plane';
	plane.material.visible = false;
	plane.rotateX(-90 * Math.PI / 180);
	plane.renderOrder  = -1;
	plane.receiveMouseEvents = true;
	plane.position.set(0, 0.1, 0);
	plane.visible = true;
	scene.add(plane);
	const keyHandler = em.findComponent('KeyHandler');
	const handleNodeMousedown = (event) => {
		const node = event.target.userData.entity;
		if(event.button === 0 && keyHandler.isPressed('Alt')) {
			corridor.removeNode(node);
		}
	};
	const handlePlaneMousedown = (event) => {
		if(event.button === 0 && keyHandler.isPressed('Shift')) {
			const {point} = event.intersection;
			const node = corridor.addNode(point.x, point.y, point.z);
			const {collider, controlView} = node;
			collider.object3d.addEventListener('mousedown', handleNodeMousedown);
		}
	};
	plane.addEventListener('mousedown', handlePlaneMousedown);
	const handleCamClick = () => {
		const {_nodes, _segments} = corridor;
		const position = new Vector3();
		const lookAt = new Vector3();
		const height = new Vector3(0, 2, 0);
		const points = [];
		const camLookAheadDistance = 4;
		const speed = 30; // units/s
		const props = {t: 0};
		const v01 = new Vector3();
		const v12 = new Vector3();
		const a = new Vector3();
		const b = new Vector3();
		const min = 1;
		const max = 4;
		const curve = new CurvePath();
		const ps = _nodes.map(({transform: {position}}) => position);

		//ps.unshift(camera.position.clone());
		//ps.unshift(camera.position.clone());
		//ps.push(camera.position.clone());
		//ps.push(camera.position.clone());

		b.copy(ps[0]);
		points.push(b.clone());
		for(var i = 1; i < ps.length - 1; i++) {
			var v0 = ps[i-1];
			var v1 = ps[i];
			var v2 = ps[i + 1];
			v01.subVectors(v1, v0);
			var len01 = v01.length();
			var dist01 = Math.min(len01 / 2, Math.max(min, Math.min(max, len01 / 3)));
			v01.normalize();
			v12.subVectors(v2, v1);
			var len12 = v12.length();
			var dist12 = Math.min(len12 / 2, Math.max(min, Math.min(max, len12 / 3)));
			v12.normalize();
			a.copy(v1).addScaledVector(v01, -dist01);
			points.push(a.clone());
			curve.add(new LineCurve3(b.clone(), a.clone()));
			b.copy(v1).addScaledVector(v12, dist12);
			points.push(b.clone());
			curve.add(new QuadraticBezierCurve3(a.clone(), v1.clone(), b.clone()));
		}
		a.copy(ps[_nodes.length-1]);
		points.push(a.clone());
		curve.add(new LineCurve3(b.clone(), a.clone()));
		//const curve = new CatmullRomCurve3(points);
		//curve.type = 'catmullrom';
		//curve.tension = 0.2;
		const curveLength = curve.getLength();
		const pathLine = new Line(new Geometry(), new LineBasicMaterial({color: 0x0000ff}));
		pathLine.material.depthWrite = false;
		pathLine.material.depthTest = false;
		pathLine.geometry.vertices = points;
		pathLine.verticesNeedUpdate = true;
		scene.add(pathLine);
		const curveLine = new Line(new Geometry(), new LineBasicMaterial({color: 0xff0000}));
		curveLine.material.depthWrite = false;
		curveLine.material.depthTest = false;
		curveLine.geometry.vertices = curve.getSpacedPoints(10000);
		curveLine.verticesNeedUpdate = true;
		curveLine.position.set(0, 1, 0);
		scene.add(curveLine);
		console.log('curveLength:', curveLength);
		TweenMax.to(props, curveLength / speed, {
			t: 1, ease: Power2.easeInOut,
			onUpdate: () => {
				const posT = 1 - props.t;
				const lookAtT = Math.max(0, Math.min(1, posT - camLookAheadDistance / curveLength));
				position.copy(curve.getPointAt(posT)).add(height);
				lookAt.copy(curve.getPointAt(lookAtT)).add(height);
				const delta = new Vector3().subVectors(position, camera.position).length();
				camera.position.copy(position);
				camera.lookAt(lookAt);
				//camera.rotateZ(delta * 0.1 * Math.PI);
			},
		});
	};
	createButton({label: 'Ride', left: 0, top: '2em', onClick: handleCamClick});
	const axis = new Vector3(0, 1, 0);
	const v = new Vector3(0, 25, 0);
	const d = new Vector3(0, -2, -3);
	var spiralLength = 1;
	var spiralLengthFactor = 1.005;
	var spiralAngle = 0.35;
	var spiralAngleFactor = 0.9;
	var a1 = 0.22;
	var a2 = 0.96;
	var a3 = 1.0005;
	var a4 = 1.0;
	for(var i = 0; i < 80; i++) {
		corridor.addNode(v.x, v.y, v.z);
		d.multiplyScalar(spiralLength);
		v.add(d);
		d.y *= 0.8;
		d.applyAxisAngle(axis, -Math.PI * a1);
		a1 *= a2;
		a2 *= a3;
		a3 *= a4;
		//console.log(a1, a2, a3, a4);
		//spiralLength *= spiralLengthFactor;
		//spiralLengthFactor *= 0.99975;
		//spiralLengthFactor *= 0.999;
		//spiralFactor *= 0.95 + Math.random() * 0.1;
		//spiralLength *= 0.995;
		//d.x += (Math.random()-0.5) * d.length() * 0.1;
		//d.z += (Math.random()-0.5) * d.length() * 0.1;
		//d.set(-d.z, d.y, d.x);
		//x += (Math.random() - 0.5) * 8;
		//z -= (4 + Math.random()*4);
	}

	app.setCamera(
		corridor._nodes[corridor._nodes.length - 1].transform.position.clone().add(new Vector3(0, 2, 0)),
		corridor._nodes[corridor._nodes.length - 2].transform.position.clone().add(new Vector3(0, 2, 0))
		//new THREE.Vector3(1, 3, 6), new THREE.Vector3(0, 1, 0)
	);
}

// Init
	function initECS(app) {
		const {scene} = app;
		const em = app.em = new EntityManager();
		const eGui = em.createEntity()
			.addComponent(Transform)
			.addComponent(App)
			.addComponent(KeyHandler)
			.addComponent(GuiControl);
		eGui.app.set(app);
		//eGui.guiControl.attachToApp(app);
		//eGui.keyHandler.attachKeyEvents(window);
		eGui.transform.addTo(scene);
	}
	function initFloor(scene) {
		const gridSize = 100;
		const floor = new Mesh(new PlaneGeometry(gridSize, gridSize, gridSize, gridSize), new MeshPhongMaterial({color: 0x555555}));
		floor.name = 'floor';
		floor.rotateX(-90 * Math.PI / 180);
		floor.renderOrder  = -1;
		floor.receiveMouseEvents = true;
		scene.add(floor);
		const floorGrid = new GridHelper(gridSize / 2, gridSize);
		floorGrid.position.set(0, 0.001, 0);
		scene.add(floorGrid);
	}
	function lights(app) {
		const {scene} = app;
		initLights(app);
		const toLeftLight = new THREE.DirectionalLight(0xffdddd, 0.5);
		toLeftLight.position.set(10, 0, 10);
		scene.add(toLeftLight);
		const toRightLight = new THREE.DirectionalLight(0xddffdd, 0.5);
		toRightLight.position.set(-10, 0, 10);
		scene.add(toRightLight);
		const toUpLight = new THREE.DirectionalLight(0xddddff, 0.5);
		toUpLight.position.set(0, -10, 10);
		scene.add(toUpLight);
		const toDownLight = new THREE.DirectionalLight(0xffffdd, 0.5);
		toDownLight.position.set(0, 10, 10);
		scene.add(toDownLight);
	}
	function Prototype_init() {
		const app = this;
		const {scene, camera, renderer} = app;
		const mouseHandler = new MouseHandler({
			domElement: renderer.domElement, camera, scene
		});
		app.mouseHandler = mouseHandler;
		const pointer = new MouseCursor({scene}).attach(mouseHandler);
		pointer.cursor.scale.set(0.02, 0.02, 0.02);
		app.pointer = pointer;
		this.setCamera(new THREE.Vector3(1, 3, 6), new THREE.Vector3(0, 1, 0));
		lights(this);
		initFloor(scene);
		const fpsControls = new FPSControls();
		fpsControls.attach(camera, scene, document.body);
		this.onrender = (time) => fpsControls.update(time);
		initECS(app);
		testConstructionKit(this);
	}
	function init() {
		var prototype = new THREEPrototype({fov: 70});
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();