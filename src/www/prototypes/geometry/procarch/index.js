 (function() {
const THREE = require('THREE');
const enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
const THREEPrototype = require('THREEPrototype');
const GeometryHelpers = require('GeometryHelpers');
const initLights = require('initLights');
const createRng = require('portable-rng');
const DatGui = require('dat').GUI;
const FPSControls = require('FPSControls');
const CorridorAssembler = require('CorridorAssembler');

const getSpacedPointsWithCorners = GeometryHelpers.getSpacedPointsWithCorners;
const Vector3 = THREE.Vector3;
const Object3D = THREE.Object3D;

const gridSize = 100;
const wallMaterial = new THREE.MeshPhongMaterial({
	color: 0xffffff, shading: THREE.FlatShading
});
const ceilingMaterial = new THREE.MeshPhongMaterial({
	color: 0xffffff, shading: THREE.FlatShading
});
const floorMaterial = new THREE.MeshPhongMaterial({
	color: 0xffffff, shading: THREE.FlatShading
});
const bulkheadMaterial = new THREE.MeshPhongMaterial({
	color: 0x333333, shading: THREE.FlatShading
});

// Builders
	const generate = require('generate');
	const generators = require('generators');
	const computeSegmentData = require('computeSegmentData');
	const buildCornerSegment = require('buildCornerSegment');
	const makeWallMesh = require('makeWallMesh');
	const generateCornerSegment = generate(buildCornerSegment);
	const makeCorridor = generators.makeCorridor;
	function buildCorridor(seed, o, length) {
		const corridorGenerator = {generator: makeCorridor, opts: {
			seed: seed,
			width: o.width,
			height: o.height,
			length: length,
			wall: o.wall,
			ceiling: o.ceiling,
			floor: o.floor,
			bulkhead: o.bulkhead.enabled?{
				depth: o.bulkhead.depth,
				thickness: o.bulkhead.bevel.amount,
				bevelDepth: o.bulkhead.bevel.bevelThickness,
				bevelSize: o.bulkhead.bevel.bevelSize,
				material: o.bulkhead.material,
			}:undefined
		}};
		return generate(corridorGenerator);
	}

// Helpers
	const white = new THREE.LineBasicMaterial({color: 0xffffff});
	const green = new THREE.LineBasicMaterial({color: 0x00ff00});
	const red = new THREE.LineBasicMaterial({color: 0xff0000});
	const blue = new THREE.LineBasicMaterial({color: 0x0000ff});
	const yellow = new THREE.LineBasicMaterial({color: 0xffff00});
	const magenta = new THREE.LineBasicMaterial({color: 0xff00ff});
	const teal = new THREE.LineBasicMaterial({color: 0x00ffff});
	const p2v = (x = 0, y = 0, z = 0) => Array.isArray(x)
		?new THREE.Vector3(x[0], x[1], x[2])
		:new THREE.Vector3(x, y, z);
	const makeLine = (points, mat) => {
		var geo = new THREE.Geometry();
		/*
		geo.vertices = points.map((v) => {
			if(!(v instanceof THREE.Vector3)) v = p2v(v);
			return new THREE.Vector3(v.x, v.z, -v.y);
		});
		*/
		geo.vertices = points.map(({x, y, z}) => new THREE.Vector3(x, y, z));
		const line = new THREE.Line(geo, mat);
		line.name = 'line';
		return line;
	};

function initFloor(scene) {
	const floor = new THREE.Mesh(new THREE.PlaneGeometry(gridSize, gridSize, gridSize, gridSize),
		new THREE.MeshPhongMaterial({color: 0x555555})
	);
	floor.rotateX(-90 * Math.PI / 180);
	floor.renderOrder  = -1;
	scene.add(floor);
	//scene.add(new THREE.WireframeHelper(floor, 0x00ff00));
	const floorGrid = new THREE.GridHelper(gridSize / 2, gridSize);
	floorGrid.position.set(0, 0.001, 0);
	//floorGrid.rotateX(-90 * Math.PI / 180);
	scene.add(floorGrid);
}

function wallOfCorridors(pt) {
	const scene = pt.scene;
	const corridorOpts = {
		width: 3,
		height: 4,
		length: 10,
		wall: {
			depth: 0.4,
			segments: 7,
			material: wallMaterial
		},
		ceiling: {
			depth: 0.4,
			segments: 7,
			material: wallMaterial
		},
		floor: {
			depth: 0.1,
			segments: 3,
			material: wallMaterial
		},
		bulkhead: {
			depth: 0.1,
			material: bulkheadMaterial,
			bevel: {
				amount: 0.2,
				bevelThickness: 0.1,
				bevelSize: 0.1,
				bevelSegments: 1
			}
		}
	};
	const root = new THREE.Object3D();
	root.position.z = -30;
	scene.add(root);
	const corridorAssembler = new CorridorAssembler();
	const perRow = 20;
	const seedCount = 100;

	var corridor, seed, pos;
	var w = corridorOpts.width + corridorOpts.wall.depth * 2;
	var h = corridorOpts.height + corridorOpts.ceiling.depth + corridorOpts.floor.depth;
	for(seed = 0; seed < seedCount; seed++) {
		pos = new THREE.Vector3(
			((seed % perRow) - Math.floor(perRow/2 - 1)) * w,
			(Math.floor(seed / perRow)) * (h + 0.2),
			0
		);

		corridorAssembler.setSeed({seed});
		corridorAssembler.generate(corridorOpts);
		//corridor = corridorAssembler.buildCorridor(corridorOpts);
		corridor = buildCorridor(seed, corridorOpts, corridorOpts.length);
		corridor.position.copy(pos);
		root.add(corridor);

		/*
		corridorOpts.rng = createRng(seed);
		var bulkhead = createBulkhead(corridorOpts);
		bulkhead.position.copy(pos);
		for(var i = 0; i < corridorOpts.length; i += 8) {
			var bh = bulkhead.clone();
			bh.position.z = -1*i - corridorOpts.depth*1;
			root.add(bh);
		}
		*/
	}
}

function corridorGUI(opts, root, onChange) {
	const changeHandler = (seed) => onChange(seed, opts);
	const gui = new DatGui();
	var refreshInterval = 500, incrementSeed = false, seed = 0;
	const setSeed = (newSeed) => {
		if(newSeed !== seed) {
			seed = newSeed;
			seedController.setValue(seed);
		}
		changeHandler(seed);
	};
	const playStart = () => {
		clearInterval(playController.intervalId);
		playController.name('Stop');
		setSeed(seed);
		playController.intervalId = setInterval(
			() => setSeed(seed+(incrementSeed?1:0)),
			refreshInterval
		);
	};
	const playStop = () => {
		clearInterval(playController.intervalId);
		playController.name('Go');
		playController.intervalId = undefined;
	};
	const togglePlay = () => (playController.intervalId === undefined)?playStart():playStop();
	const playController = gui.add({'Go': togglePlay}, 'Go');
	const intervalController = gui.add({'Interval': refreshInterval}, 'Interval', 20, 1000).step(20);
	intervalController.onChange((val) => {
		refreshInterval = val;
		if(playController.intervalId !== undefined) playStart();
	});
	const seedController = gui.add({seed: 0}, 'seed').min(0).max(10000).step(1);
	seedController.onChange(setSeed);
	gui.add({incrementSeed: incrementSeed}, 'incrementSeed').onChange((val) => incrementSeed = val);
	gui.add(opts, 'width', 0.5, 10);
	gui.add(opts, 'height', 0.5, 10);
	gui.add(opts, 'length', 0.5, 50);
	// Walls
		const fWall = gui.addFolder('Walls');
		fWall.add(opts.wall, 'depth', 0.005, 1);
		fWall.add(opts.wall, 'segments', 1, 30).step(1);
	// Ceiling
		const fCeiling = gui.addFolder('Ceiling');
		fCeiling.add(opts.ceiling, 'depth', 0.005, 1);
		fCeiling.add(opts.ceiling, 'segments', 1, 30).step(1);
	// Floor
		const fFloor = gui.addFolder('Floor');
		fFloor.add(opts.floor, 'depth', 0.005, 1);
		fFloor.add(opts.floor, 'segments', 1, 30).step(1);
	// Blukhead
		const fBulkhead = gui.addFolder('Bulkhead');
		fBulkhead.add(opts.bulkhead, 'enabled');
		fBulkhead.add(opts.bulkhead, 'depth', 0.005, 1);
		fBulkhead.add(opts.bulkhead.bevel, 'amount', 0.005, 1);
		fBulkhead.add(opts.bulkhead.bevel, 'bevelThickness', 0.005, 1);
		fBulkhead.add(opts.bulkhead.bevel, 'bevelSize', 0.005, 1);
	seedController.setValue(0);
	return gui;
}

function testA(pt) {
	const scene = pt.scene;
	const corridorOpts = {
		seed: 0,
		width: 2,
		height: 3,
		length: 5,
		wall: {
			depth: 0.2,
			segments: 7,
			material: wallMaterial
		},
		ceiling: {
			depth: 0.2,
			segments: 7,
			material: ceilingMaterial
		},
		floor: {
			depth: 0.1,
			segments: 3,
			material: floorMaterial
		},
		bulkhead: {
			enabled: true,
			depth: 0.075,
			material: bulkheadMaterial,
			bevel: {
				amount: 0.2,
				bevelThickness: 0.1,
				bevelSize: 0.1,
				bevelSegments: 1
			}
		}
	};
	const root = new THREE.Object3D();
	//const corridorAssembler = new CorridorAssembler(createRng(0));
	var wall;
	root.position.set(0, 0.1, 0);
	scene.add(root);

	const createMaker = (generator) => (opts) => ({generator, opts});
	const wrapGenerator = require('wrapGenerator');
	const createGenerator = require('createGenerator');
	const makeProfile = require('makeProfile');
	const makeOutlineFromProfile = require('makeOutlineFromProfile');
	const profileMaker = createMaker(makeProfile);
	const outlineFromProfileMaker = createMaker(makeOutlineFromProfile);

	function __computeSegments(points, w) {
		const segments = [];
		var corner, segment, prevVOut;
		if(points.length === 2) {
			const v0 = p2v(points[0]);
			const v1 = p2v(points[1]);
			const v01 = new Vector3().subVectors(v1, v0).normalize();
			const perp01 = p2v(v01.y, -v01.x, v01.z);
			segment = {
				v0: v0, v1: v1,
				start: v0, end: v1,
				perp: perp01,
			};
		} else {
			for(var i = 0; i < points.length - 2; i++) {
				var {v0, v1, v2, vIn, vOut, perp01, perp12, miter} = makeCornerData({a: points[i], b: points[i+1], c: points[i+2], width: w});
				segment = {
					v0: v0,
					v1: v1,
					start: (i === 0)?v0:prevVOut,
					end: vIn,
					perp: perp01,
					miter: miter,
				};
				segments.push(segment);
				prevVOut = vOut;
			}
			segment = {
				v0: v1,
				v1: v2,
				start: vOut,
				end: v2,
				perp: perp12,
			};
		}
		segments.push(segment);
		return segments;
	}
	function buildCorridorOutlines(root, segments) {
		segments.forEach(({v0, v1, start, end, perp, miter}, idx) => {
			root.add(makeLine([v0, v1], white));
			root.add(makeLine([
				start.clone().sub(perp),
				start.clone().add(perp),
				end.clone().add(perp),
				end.clone().sub(perp),
				start.clone().sub(perp)
			], yellow));
			if(idx < segments.length - 1) {
				root.add(makeLine([
					v1.clone().sub(miter),
					v1.clone().add(miter),
				], magenta));
			}
		});
		return root;
	}
	function buildCorridorSegments(root, points, segments, corridorOpts) {
		segments.forEach(({v0, v1, start, end, perp, miter}, idx) => {
			const corridor = buildCorridor(corridorAssembler.seeds.seed, corridorOpts, start.clone().sub(end).length());
			corridor.position.copy(new Vector3(start.x, start.y, start.z));
			corridor.lookAt(new Vector3(end.x, end.y, end.z));
			corridor.rotateY(Math.PI);
			root.add(corridor);
		});
		return root;
	}
	function buildCorridorCorners(root, segments, corridorOpts) {
		const w = corridorOpts.width;
		function buildCorner(seg0, seg1) {
			const start = seg0.end;
			const pos = seg0.v1;
			const end = seg1.start;
			const xw0 = seg0.perp;
			const xw1 = seg1.perp;
			const corner = new THREE.Object3D();
			corner.position.set(pos.x, pos.z, -pos.y);
			var inside0 = seg0.end.clone().sub(xw0);
			var inside1 = pos.clone().sub(seg0.miter);
			var inside2 = seg1.start.clone().sub(xw1);
			var outside0 = seg0.end.clone().add(xw0);
			var outside1 = pos.clone().add(seg0.miter);
			var outside2 = seg1.start.clone().add(xw1);
			var wallFuncName = 'buildRightWall';
			if(inside0.clone().sub(inside2).length() > outside0.clone().sub(outside2).length()) {
				[inside0, outside0] = [outside0, inside0];
				[inside1, outside1] = [outside1, inside1];
				[inside2, outside2] = [outside1, inside2];
				wallFuncName = 'buildLeftWall';
			}
			// Wall 1
				var wall0 = corridorAssembler[wallFuncName](Object.assign({}, corridorOpts, {
					length: outside1.clone().sub(outside0).length() + corridorOpts.wall.depth
				}));
				corner.add(wall0);
				wall0.position.copy(new THREE.Vector3(outside0.x, outside0.z, -outside0.y));
				wall0.lookAt(new THREE.Vector3(outside1.x, outside1.z, -outside1.y));
				wall0.rotateY(Math.PI);
				wall0.position.sub(corner.position);
			// Wall 2
				var wall1 = corridorAssembler[wallFuncName](Object.assign({}, corridorOpts, {
					length: outside2.clone().sub(outside1).length() + corridorOpts.wall.depth
				}));
				corner.add(wall1);
				var wall1Offset = outside2.clone().sub(outside1).normalize().multiplyScalar(corridorOpts.wall.depth);
				wall1.position.copy(new THREE.Vector3(outside1.x, outside1.z, -outside1.y));
				wall1.position.sub(new THREE.Vector3(wall1Offset.x, wall1Offset.z, -wall1Offset.y));
				wall1.lookAt(new THREE.Vector3(outside2.x, outside2.z, -outside2.y));
				wall1.rotateY(Math.PI);
				wall1.position.sub(corner.position);
			// Floor
				var floorShape = new THREE.Shape([outside0, outside1, outside2, inside1].map((v) => v.clone().sub(pos)));
				var floorGeo = floorShape.extrude({
					amount: corridorOpts.floor.depth,
					bevelEnabled: false,
				});
				floorGeo.rotateX(-0.5 * Math.PI);
				//var ceilGeo = floorGeo.clone();
				floorGeo.translate(0, -corridorOpts.floor.depth, 0);
				var floor = new THREE.Mesh(floorGeo, corridorOpts.floor.material);
				corner.add(floor);
			// Ceiling
				var ceilingGeo = floorShape.extrude({
					amount: corridorOpts.ceiling.depth,
					bevelEnabled: false,
				});
				ceilingGeo.rotateX(-0.5 * Math.PI);
				ceilingGeo.translate(0, corridorOpts.height, 0);
				const ceiling = new THREE.Mesh(ceilingGeo, corridorOpts.ceiling.material);
				corner.add(ceiling);
			// Bulkhead
				if(corridorOpts.bulkhead && corridorOpts.bulkhead.enabled !== false) {
					const bulkheadOpts = Object.assign({}, corridorOpts, {
						width: outside1.clone().sub(inside1).length()
					});
					var bulkheadShape = new THREE.Shape(corridorAssembler.getBulkheadOutline(bulkheadOpts));
					corridorAssembler.bulkheadGeometry = bulkheadShape.extrude(bulkheadOpts.bulkhead.bevel);
					corridorAssembler.bulkheadGeometry.translate(0, 0, -0.5 * corridorOpts.bulkhead.bevel.amount);
					const bulkhead = corridorAssembler.buildBulkhead(bulkheadOpts);
					bulkhead.position.copy(new THREE.Vector3(pos.x, pos.z, -pos.y));
					bulkhead.lookAt(new THREE.Vector3(outside1.x, outside1.z, -outside1.y));
					bulkhead.rotateY(0.5 * Math.PI);
					bulkhead.position.sub(corner.position);
					corner.add(bulkhead);
					// Reset bulkhead geometry
					bulkheadShape = new THREE.Shape(corridorAssembler.getBulkheadOutline(corridorOpts));
					corridorAssembler.bulkheadGeometry = bulkheadShape.extrude(corridorOpts.bulkhead.bevel);
					corridorAssembler.bulkheadGeometry.translate(0, 0, -0.5 * corridorOpts.bulkhead.bevel.amount);
				}
			root.add(makeLine([outside0, outside1, outside2, inside1], teal));
			return corner;
		}
		for(var i = 0; i < segments.length - 1; i++) {
			root.add(buildCorner(segments[i], segments[i+1]));
		}
		return root;
	}
	function drawCorridor(points, corridorOpts) {
		const root = new Object3D();
		const segments = computeSegmentData({points, width: corridorOpts.width});
		const lines = new Object3D();
		root.add(lines);

		const makeOutlineExtrusion = ({outline, extrude}, generate) => new THREE.Shape(generate(outline)).extrude(extrude);
		const outlineExtrusionMaker = createMaker(makeOutlineExtrusion);

		const wallProfile = profileMaker({
			seed: 0,
			segments: 7,
			symmetrical: false
		});
		const makeUnitWall = createMaker(({profile, height, depth, material}, generate) => {
			const extrude = {amount: 1, bevelEnabled: false};
			const outline = outlineFromProfileMaker({profile});
			const geometry = generate(outlineExtrusionMaker({outline, extrude}));
			geometry.rotateX(0.5 * Math.PI);
			geometry.rotateZ(0.5 * Math.PI);
			geometry.translate(-0.5, 0, -1);
			const mesh = new THREE.Mesh(geometry, material);
			mesh.name = 'wall';
			mesh.scale.set(1, height, depth);
			return mesh;
		});

		const wall = makeUnitWall({
			profile: wallProfile,
			height: corridorOpts.height,
			depth: corridorOpts.wall.depth,
			material: corridorOpts.wall.material
		});

		//buildCorridorOutlines(lines, segments);
		//buildCorridorSegments(root, points, segments, corridorOpts);
		// Corridors
			segments.forEach(({start, end}, idx) => {
				const corridor = buildCorridor(0, corridorOpts, start.clone().sub(end).length());
				corridor.position.copy(new Vector3(start.x, start.y, start.z));
				corridor.lookAt(new Vector3(end.x, end.y, end.z));
				corridor.rotateY(Math.PI);
				root.add(corridor);
			});
		// Corners
			for(var i = 0; i < segments.length -1; i++) {
				const a = segments[i];
				const b = segments[i+1];
				const corner = generateCornerSegment({
					seg0: segments[i],
					seg1: segments[i+1],
					wall,
					floor: corridorOpts.floor,
					ceiling: corridorOpts.ceiling,
				});
				root.add(corner);
			}
			/*
		segments.forEach(({v0, v1, start, end, perp, miter}, idx) => {
			if(idx === 0) return;
			const prev = segments[]

			const corner = buildCornerSegment({v0});
			root.add(corner);
		});
		*/

		//buildCorridorCorners(root, segments, corridorOpts);
		return root;
	}
	const points = [
		{x: 0, y: 0, z: 3},
		{x: 0, y: 0, z: -3},
		{x: 7, y: 0, z: -5},
		{x: 5, y: 0, z: -10},
		{x: 10, y: 0, z: -13},
		{x: 16, y: 0, z: -14},
		{x: 30, y: 0, z: -14},
		{x: 30, y: 0, z: 0}
	];
	var corridor;
	var corridorGenHash, corridorsGen = 0;
	var corridorConHash, corridorsCon = 0;
	function generateCorridorData(seed, opts) {
		var newHash = JSON.stringify({seed, opts});
		if(newHash === corridorGenHash) return;
		corridorGenHash = newHash;
		console.log('generating corridor x', corridorsGen++);
		//corridorAssembler.setSeed({seed});
		//corridorAssembler.generate(opts);
	}
	function constructCorridor(points, seed, opts) {
		generateCorridorData(seed, opts);
		var newHash = JSON.stringify({points, seed, opts});
		if(newHash === corridorConHash) return;
		corridorConHash = newHash;
		console.log('constructing corridor x', corridorsCon++);
		root.remove(corridor);
		corridor = drawCorridor(points, opts);
		root.add(corridor);
	}
	
	points.forEach((p) => {
		const camera = pt.camera;
		const renderer = pt.renderer;
		var control = new THREE.TransformControls(camera, renderer.domElement);
		var pObj = new THREE.Object3D();
		pObj.position.copy(p);
		scene.add(pObj);
		control.attach(pObj);
		control.addEventListener('change', (e) => {
			p.x = control.position.x;
			p.y = control.position.y;
			p.z = control.position.z;
			root.remove(corridor);
			corridor = drawCorridor(points, corridorOpts);
			root.add(corridor);
		});
		scene.add(control);
	});
	
	const gui = corridorGUI(corridorOpts, root, (seed, opts) => constructCorridor(points, seed, opts));
	gui.close();
}

function Prototype_init() {
	//initUI2d(this);
	const scene = this.scene;
	const camera = this.camera;
	this.setCamera(new THREE.Vector3(6, 14, 6), new THREE.Vector3(7, 3, -3));
	//this.setCamera(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1));
	initLights(this);

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

	//scene.add(new THREE.DirectionalLightHelper(light, 100));
	initFloor(scene);
	const fpsControls = new FPSControls();
	fpsControls.attach(camera, scene, document.body);
	this.onrender = (time) => fpsControls.update(time);
	//require('testLineTex')(this, '/images/uv_checker.png'); //'/images/cakeBorder.png'
	wallOfCorridors(this);
	testA(this);
	//testB(this);
}

function init() {
	var prototype = new THREEPrototype({
		fov: 70
	});
	prototype.oninit = Prototype_init;
	prototype.start();
}

document.addEventListener('DOMContentLoaded', init);
	
})();