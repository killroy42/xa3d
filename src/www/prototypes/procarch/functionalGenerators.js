(function() {
const createRng = require('portable-rng');
const THREE = require('THREE');
const Vector3 = THREE.Vector3;
const Object3D = THREE.Object3D;

const MAT4_MIRRORX = new THREE.Matrix4();
	MAT4_MIRRORX.elements[0] = -1;
	MAT4_MIRRORX.elements[10] = -1;
	MAT4_MIRRORX.elements[14] = -1;
const MAT4_MIRRORY = new THREE.Matrix4();
	MAT4_MIRRORY.elements[5] = -1;
	MAT4_MIRRORY.elements[10] = -1;
	MAT4_MIRRORY.elements[14] = -1;

// generate
	const createSource = (generator) => (opts) => ({generator, opts});
	const wrapGenerator = (generator) => (opts, generate) => generate?generator(opts, generate):{generator, opts};
	const createGenerator = (generator, generate) => (opts) => generate({generator, opts}, generate);
	const generate = (source) => {
		if(typeof source === 'function') {
			console.log('name', source.name, typeof source.name, source.name.length);
			//maker.name = maker.toString();
			const generator = createGenerator(source, generate);
			return generator;
		}
		const {generator, opts} = source;
		//console.log(source);
		//console.log('generator:', generator);
		//console.log('opts:', opts);
		return generator(opts, generate);
		/*
		generate.cache = generate.cache || {};
		const cache = generate.cache[generator.name] = generate.cache[generator.name] || {};
		const hash = JSON.stringify(opts);
		if(cache[hash] === undefined) cache[hash] = generator(opts, generate);
		return (typeof cache[hash].clone === 'function')?cache[hash].clone():cache[hash];
		*/
	};
	const construct = (generate) => {
		const resolve = (val) => {
			var res;
			//console.group('resolve');
			if(
				(val === null) ||
				(val === undefined) ||
				(typeof val !== 'object') ||
				(val.constructor !== Object)
			) {
				res = val;
			} else if(typeof val.generator === 'function') {
				res = generate({generator: val.generator, opts: resolve(val.opts)});
			} else {
				res = {};
				for(var key in val) res[key] = resolve(val[key]);
			}
			//console.groupEnd('resolve');
			return res;
		};
		return resolve;
	};


// Maker Functions
	const makeProfile = ({seed, segments, symmetrical}, generate) => {
		const rng = createRng(seed);
		const numPoints = Math.floor(rng() * segments);
		var i;
		const points = [];
		if(symmetrical !== true) {
			for(i = 0; i < numPoints; i++) points.push({x: rng(), y: rng()});
			points.sort((a, b) => a.x - b.x);
		} else {
			for(i = 0; i < Math.ceil(numPoints/2); i++) points.push({x: rng()*0.5, y: rng()});
			points.sort((a, b) => a.x - b.x);
			if(numPoints % 2 === 1) points[Math.floor(numPoints/2)].x = 0.5;
			for(i = 0; i < Math.floor(numPoints/2); i++) {
				points[numPoints - i - 1] = {x: 1 - points[i].x, y: points[i].y};
			}
		}
		return points;
	};
	const makeOutlineFromProfile = ({profile}, generate) => [{x: 1, y: 1}, {x: 1, y: 0}, {x: 0, y: 0}, {x: 0, y: 1}]
		.concat(generate(profile).map(({x, y}) => ({x: x, y: 1 - y})))
		.map(({x, y}) => new THREE.Vector3(x, y, 0));
	const makeOutlineExtrusion = ({outline, extrude}, generate) => new THREE.Shape(generate(outline)).extrude(extrude);
	const makeExtrudedProfile = ({seed, segments, symmetrical}, generate) => {
		const extrude = {amount: 1, bevelEnabled: false};
		const profile = {generator: makeProfile, opts: {seed, segments, symmetrical}};
		const outline = {generator: makeOutlineFromProfile, opts: {profile}};
		const extrusion = {generator: makeOutlineExtrusion, opts: {outline, extrude}};
		return generate(extrusion);
	};
	const makeWallProfile = ({seed, segments}, generate) => generate({generator: makeProfile, opts: {seed, segments, symmetrical: false}});
	const makeWallGeometry = ({seed, segments}, generate) => {
		const geometryGenerator = {generator: makeExtrudedProfile, opts: {seed, segments, symmetrical: false}};
		const geometry = generate(geometryGenerator);
		geometry.rotateX(0.5 * Math.PI);
		geometry.rotateZ(0.5 * Math.PI);
		geometry.translate(0, 0, -1);
		return geometry;
	};
	const makeWallMesh = ({seed, segments, width, height, depth, material}, generate) => {
		const geometry = {generator: makeWallGeometry, opts: {seed, segments}};
		const mesh = new THREE.Mesh(generate(geometry), material);
		mesh.name = 'wall';
		mesh.scale.set(width, height, depth);
		return mesh;
	};
	const makeLeftWall = ({seed, segments, depth, material, width, height, length}, generate) => {
		const mesh = {generator: makeWallMesh, opts: {seed, segments, width: length, height, depth, material}};
		const wall = generate(mesh);
		wall.rotation.set(0, 0.5 * Math.PI, 0);
		wall.position.set(-0.5 * width, 0, 0);
		return wall;
	};
	const makeRightWall = ({seed, segments, depth, material, width, height, length}, generate) => {
		const mesh = {generator: makeWallMesh, opts: {seed, segments, width: length, height, depth, material}};
		const wall = generate(mesh);
		wall.rotation.set(0, -0.5 * Math.PI, 0);
		wall.position.set(0.5 * width, 0, -length);
		return wall;
	};
	const makeCeilingProfile = ({seed, segments}, generate) => generate({generator: makeProfile, opts: {seed, segments, symmetrical: true}});
	const makeCeilingGeometry = ({seed, segments}, generate) => {
		const geometryGenerator = {generator: makeExtrudedProfile, opts: {seed, segments, symmetrical: true}};
		const geometry = generate(geometryGenerator);
		geometry.rotateZ(Math.PI);
		geometry.translate(0.5, 1, -1);
		return geometry;
	};
	const makeCeilingMesh = ({seed, segments, depth, material, width, height, length}, generate) => {
		const geometry = {generator: makeCeilingGeometry, opts: {seed, segments}};
		const mesh = new THREE.Mesh(generate(geometry), material);
		mesh.name = 'ceiling';
		mesh.scale.set(width, depth, length);
		mesh.position.set(0, height, 0);
		return mesh;
	};
	const makeFloorGeometry = ({seed, segments}, generate) => {
		const geometryGenerator = {generator: makeExtrudedProfile, opts: {seed, segments, symmetrical: true}};
		const geometry = generate(geometryGenerator);
		geometry.translate(-0.5, -1, -1);
		return geometry;
	};
	const makeFloorMesh = ({seed, segments, depth, material, width, height, length}, generate) => {
		const geometry = {generator: makeFloorGeometry, opts: {seed, segments}};
		const mesh = new THREE.Mesh(generate(geometry), material);
		mesh.name = 'floor';
		mesh.scale.set(width, depth, length);
		return mesh;
	};
	const makeBulkheadOutline = ({seed, width, height, wall, ceiling, floor, bulkhead}, generate) => {
		const rng = createRng(seed);
		const wallSeed = rng();
		const ceilingSeed = rng();
		const floorSeed = rng();
		const wd = wall.depth;
		const cd = ceiling.depth;
		const fd = floor.depth;
		const bd = bulkhead.depth;
		const filterWall = (p) => p.x < 1 - (bd / height);
		const filterCeiling = (p) => p.x > (bd / width) && p.x < 1 - (bd / width);
		const wallProfile = generate({generator: makeWallProfile, opts: {seed: wallSeed, segments: wall.segments}});
		const ceilingProfile = generate({generator: makeCeilingProfile, opts: {seed: ceilingSeed, segments: ceiling.segments}});
		const x = 0.5 * width;
		const y = height;
		return [].concat(
			[{x: -x + bd, y: -fd}, {x: -x + bd, y: 0}],
			wallProfile
				.filter(filterWall)
				.map((p) => ({x: -x - p.y * wd + bd, y: p.x * height})),
			[{x: -x + bd, y: y - bd}],
			ceilingProfile
				.filter(filterCeiling)
				.map((p) => ({x: -x + p.x * width, y: y + p.y * cd - bd})),
			[{x: x - bd, y: y - bd}],
			wallProfile
				.filter(filterWall)
				.map((p) => ({x: x + p.y * wd - bd, y: p.x * height})).reverse(),
			[{x: x - bd, y: 0}, {x: x - bd, y: -fd}],
			[
				{x:  x + wd, y: -fd},
				{x:  x + wd, y: y + cd},
				{x: -x - wd, y: y + cd},
				{x: -x - wd, y: -fd},
			]
		)
		.map(({x, y}) => new THREE.Vector3(x, y, 0));
	};
	const makeBulkheadMesh = ({seed, width, height, wall, ceiling, floor, bulkhead}, generate) => {
		const outline = {generator: makeBulkheadOutline, opts: {seed, width, height, wall, ceiling, floor, bulkhead}};
		const shape = new THREE.Shape(generate(outline));
		const geometry = shape.extrude({
			amount: bulkhead.thickness,
			bevelThickness: bulkhead.bevelDepth,
			bevelSize: bulkhead.bevelSize,
			bevelSegments: 1
		});
		geometry.translate(0, 0, -0.5 * bulkhead.thickness);
		const mesh = new THREE.Mesh(geometry, bulkhead.material);
		mesh.name = 'bulkhead';
		return mesh;
	};
	const buildBulkheadOutline = ({
		width, height,
		wallDepth, wallProfile,
		ceilingDepth, ceilingProfile,
		floorDepth,
		bulkheadDepth
	}) => {
		const wd = wallDepth;
		const cd = ceilingDepth;
		const fd = floorDepth;
		const bd = bulkheadDepth;
		const filterWall = (p) => p.x < 1 - (bd / height);
		const filterCeiling = (p) => p.x > (bd / width) && p.x < 1 - (bd / width);
		const x = 0.5 * width;
		const y = height;
		return [].concat(
			[{x: -x + bd, y: -fd}, {x: -x + bd, y: 0}],
			wallProfile
				.filter(filterWall)
				.map((p) => ({x: -x - p.y * wd + bd, y: p.x * height})),
			[{x: -x + bd, y: y - bd}],
			ceilingProfile
				.filter(filterCeiling)
				.map((p) => ({x: -x + p.x * width, y: y + p.y * cd - bd})),
			[{x: x - bd, y: y - bd}],
			wallProfile
				.filter(filterWall)
				.map((p) => ({x: x + p.y * wd - bd, y: p.x * height})).reverse(),
			[{x: x - bd, y: 0}, {x: x - bd, y: -fd}],
			[
				{x:  x + wd, y: -fd},
				{x:  x + wd, y: y + cd},
				{x: -x - wd, y: y + cd},
				{x: -x - wd, y: -fd},
			]
		)
		.map(({x, y}) => new THREE.Vector3(x, y, 0));
	};
	const buildBulkheadMesh = ({bulkhead, outline}) => {
		const shape = new THREE.Shape(outline);
		const geometry = shape.extrude({
			amount: bulkhead.thickness,
			bevelThickness: bulkhead.bevelDepth,
			bevelSize: bulkhead.bevelSize,
			bevelSegments: 1
		});
		geometry.translate(0, 0, -0.5 * bulkhead.thickness);
		const mesh = new THREE.Mesh(geometry, bulkhead.material);
		mesh.name = 'bulkhead';
		return mesh;
	};
	const makeCorridor = ({seed, width, height, length, wall, ceiling, floor, bulkhead}, generate) => {
		const rng = createRng(seed);
		const wallSeed = rng();
		const ceilingSeed = rng();
		const floorSeed = rng();
		const leftWall = {generator: makeLeftWall, opts: {seed: wallSeed, segments: wall.segments, depth: wall.depth, material: wall.material, width, height, length}};
		const rightWall = {generator: makeRightWall, opts: {seed: wallSeed, segments: wall.segments, depth: wall.depth, material: wall.material, width, height, length}};
		const ceilingMesh = {generator: makeCeilingMesh, opts: {seed: ceilingSeed, segments: ceiling.segments, depth: ceiling.depth, material: ceiling.material, width, height, length}};
		const floorMesh = {generator: makeFloorMesh, opts: {seed: floorSeed, segments: floor.segments, depth: floor.depth, material: floor.material, width, length}};
		const corridor = new THREE.Object3D();
		corridor.add(generate(leftWall));
		corridor.add(generate(rightWall));
		corridor.add(generate(ceilingMesh));
		corridor.add(generate(floorMesh));
		if(bulkhead) {
			const bulkheadMesh = {generator: makeBulkheadMesh, opts: {seed, width, height, wall, ceiling, floor, bulkhead}};
			const frontBulkhead = generate(bulkheadMesh);
			frontBulkhead.position.set(0, 0, -0.5 * bulkhead.thickness);
			corridor.add(frontBulkhead);
			const rearBulkhead = generate(bulkheadMesh);
			rearBulkhead.position.set(0, 0, -length + 0.5 * bulkhead.thickness);
			corridor.add(rearBulkhead);
		}
		return corridor;
	};


const p2v = (x = 0, y = 0, z = 0) => Array.isArray(x)
	?new Vector3(x[0], x[1], x[2])
	:new Vector3(x, y, z);

const computeCornerData = ({a, b, c, width}, generate) => {
	const halfWidth = 0.5 * width;
	const xw = (v, s = 1) => v.clone().multiplyScalar(halfWidth * s);
	const v0 = p2v(a);
	const v1 = p2v(b);
	const v01 = new Vector3().subVectors(v1, v0).normalize();
	const perp01 = p2v(v01.y, -v01.x, v01.z).multiplyScalar(halfWidth);
	const v2 = p2v(c);
	const v12 = new Vector3().subVectors(v2, v1).normalize();
	const perp12 = p2v(v12.y, -v12.x, v12.z).multiplyScalar(halfWidth);
	const tangent = new Vector3().addVectors(v01, v12).normalize();
	const normal = p2v(tangent.y, -tangent.x, tangent.z);
	const miter = xw(normal, 1 / normal.clone().dot(perp01));
	const lenIn = new Vector3().subVectors(miter, perp01).length();
	const vIn = v1.clone().addScaledVector(v01, -lenIn);
	const lenOut = new Vector3().subVectors(perp12, miter).length();
	const vOut = v1.clone().addScaledVector(v12, lenOut);
	return {v0, v1, v2, v01, v12, perp01, perp12, miter, vIn, vOut};
};

const computeSegmentData = ({points, width}, generate) => {
	const halfWidth = 0.5 * width;
	const segments = [];
	const PLANE = 'y';
	//const PLANE_IDX = 2;
	// vars
		var v0, v1, v2, v01, v12, perp, vOut, start, end, miter;
		const tangent = new Vector3();
		const normal = new Vector3();
		const vecIn = new Vector3();
		const vecOut = new Vector3();
	// start first segment
		v0 = new Vector3().copy(points[0]); v0[PLANE] = 0;
		v1 = new Vector3().copy(points[1]); v1[PLANE] = 0;
		v01 = new Vector3().subVectors(v1, v0).normalize();
		perp = new Vector3(v01.z, v01.y, -v01.x).multiplyScalar(halfWidth);
		start = v0;
	for(var i = 2; i < points.length; i++) {
		// complete segment at corner
			v2 = new Vector3().copy(points[i]); v2[PLANE] = 0;
			v12 = new Vector3().subVectors(v2, v1).normalize();
			tangent.addVectors(v01, v12).normalize();
			normal.set(tangent.z, tangent.y, -tangent.x);
			miter = new Vector3().copy(normal).multiplyScalar(halfWidth * (1 / normal.dot(perp)));
			vecIn.subVectors(miter, perp);
			end = v1.clone().addScaledVector(v01, -vecIn.length());
			v0[PLANE] = start[PLANE] = points[i-2][PLANE];
			v1[PLANE] = end[PLANE] = points[i-1][PLANE];
			segments.push({v0, v1, start, end, perp, miter});
		// start next segment
			v0 = v1; v0[PLANE] = 0;
			v1 = v2;
			v01 = v12;
			perp = new Vector3(v01.z, v01.y, -v01.x).multiplyScalar(halfWidth);
			vecOut.subVectors(perp, miter);
			start = v0.clone().addScaledVector(v01, vecOut.length());
	}
	// end last segment
		v0[PLANE] = start[PLANE] = points[i-2][PLANE];
		v1[PLANE] = end[PLANE] = points[i-1][PLANE];
		segments.push({v0, v1, start, end: v1, perp});
	return segments;
};


// Helpers
	const white = new THREE.LineBasicMaterial({color: 0xffffff});
	const green = new THREE.LineBasicMaterial({color: 0x00ff00});
	const red = new THREE.LineBasicMaterial({color: 0xff0000});
	const blue = new THREE.LineBasicMaterial({color: 0x0000ff});
	const yellow = new THREE.LineBasicMaterial({color: 0xffff00});
	const magenta = new THREE.LineBasicMaterial({color: 0xff00ff});
	const teal = new THREE.LineBasicMaterial({color: 0x00ffff});
	const makeLine = (points, mat) => {
		var geo = new THREE.Geometry();
		geo.vertices = points.map(({x, y, z}) => new Vector3(x, y, z));
		const line = new THREE.Line(geo, mat);
		line.name = 'line';
		return line;
	};

const buildCornerSegment = ({seg0, seg1, wall, floor, ceiling}, generate) => {
	const {end, v1, perp: perp0, miter} = seg0;
	const {start, perp: perp1} = seg1;
	const corner = new Object3D();
	corner.position.copy(v1);
	var inside0 = end.clone().sub(perp0);
	var inside1 = v1.clone().sub(miter);
	var inside2 = start.clone().sub(perp1);
	var outside0 = end.clone().add(perp0);
	var outside1 = v1.clone().add(miter);
	var outside2 = start.clone().add(perp1);
	var wallRotation = -0.5 * Math.PI;
	if(inside0.clone().sub(inside2).length() > outside0.clone().sub(outside2).length()) {
		[inside0, outside0] = [outside0, inside0];
		[inside1, outside1] = [outside1, inside1];
		[inside2, outside2] = [outside1, inside2];
		wallRotation *= -1;
	}
	corner.add(makeLine([end, v1].map((v) => v.clone().sub(v1)), green));
	corner.add(makeLine([v1, start].map((v) => v.clone().sub(v1)), red));
	corner.add(makeLine([inside1, outside0, outside1, outside2, inside1].map((v) => v.clone().sub(v1)), magenta));
	const wallMesh = generate(wall);
	
	// First wall
		const wall0 = wallMesh.clone();
		corner.add(wall0);
		const outside01 = new Vector3().subVectors(outside1, outside0);
		const outside01Len = outside01.length();
		outside01.normalize();
		wall0.scale.x = outside01Len + wall0.scale.z;
		wall0.position.copy(outside0);
		wall0.position.addScaledVector(outside01, 0.5 * outside01Len);
		wall0.lookAt(outside1);
		wall0.rotateY(wallRotation);
		wall0.position.addScaledVector(outside01, 0.5 * wall0.scale.z);
		wall0.position.sub(v1);
	// Second wall
		const wall1 = wallMesh.clone();
		corner.add(wall1);
		const outside12 = new Vector3().subVectors(outside2, outside1);
		const outside12Len = outside12.length();
		outside12.normalize();
		wall1.scale.x = outside12Len + wall1.scale.z;
		wall1.position.copy(outside1);
		wall1.position.addScaledVector(outside12, 0.5 * outside12Len);
		wall1.lookAt(outside2);
		wall1.rotateY(wallRotation);
		wall1.position.addScaledVector(outside12, -0.5 * wall1.scale.z);
		wall1.position.sub(v1);
	// Floor
		var floorShape = new THREE.Shape([inside1, outside0, outside1, outside2]
			.map((v) => ({x: v.x - v1.x, y: v.z - v1.z})));
		var floorGeo = floorShape.extrude({amount: floor.depth, bevelEnabled: false});
		floorGeo.rotateX(0.5 * Math.PI);
		//var ceilGeo = floorGeo.clone();
		//floorGeo.translate(0, -floor.depth, 0);
		const floorMesh = new THREE.Mesh(floorGeo, floor.material);
		corner.add(floorMesh);
	// Ceiling
		var ceilingGeo = floorShape.extrude({amount: ceiling.depth, bevelEnabled: false});
		ceilingGeo.rotateX(0.5 * Math.PI);
		ceilingGeo.translate(0, wall0.scale.y, 0);
		ceilingGeo.translate(0, ceiling.depth, 0);
		const ceilingMesh = new THREE.Mesh(ceilingGeo, ceiling.material);
		corner.add(ceilingMesh);
	// Bulkhead
		const material = new THREE.MeshPhongMaterial({
			color: 0xffffff, shading: THREE.FlatShading
		});
		const opts = {
			seed: 0,
			width: 2,
			height: 3,
			length: 5,
			wall: {
				depth: 0.2,
				segments: 7,
				material: material
			},
			ceiling: {
				depth: 0.2,
				segments: 7,
				material: material
			},
			floor: {
				depth: 0.1,
				segments: 3,
				material: material
			},
			bulkhead: {
				depth: 0.1,
				thickness: 0.2,
				bevelDepth: 0.1,
				bevelSize: 0.1,
				material: material,
			}
		};
		const seeds = {
			seed: 0,
			wall: 0,
			ceiling: 0,
			floor: 0,
		};
		const wallProfileOpts = {seed: seeds.wall, segments: opts.wall.segments};
		const ceilingProfileOpts = {seed: seeds.ceiling, segments: opts.ceiling.segments};

		const makeWallProfileSource = createSource(makeWallProfile);
		const makeCeilingProfileSource = createSource(makeCeilingProfile);
		const makeBulkheadOutlineSource = createSource(buildBulkheadOutline);
		const makeBulkheadMeshSource = createSource(buildBulkheadMesh);

		const wallProfileSource = makeWallProfileSource({
			seed: seeds.wall,
			segments: opts.wall.segments
		});
		const	ceilingProfileSource = makeCeilingProfileSource({
			seed: seeds.ceiling,
			segments: opts.ceiling.segments
		});
		const bulkheadOutlineSource = makeBulkheadOutlineSource({
			width: outside1.clone().sub(inside1).length(),
			height: opts.height,
			wallDepth: opts.wall.depth,
			wallProfile: wallProfileSource,
			ceilingDepth: opts.ceiling.depth,
			ceilingProfile: ceilingProfileSource,
			floorDepth: opts.floor.depth,
			bulkheadDepth: opts.bulkhead.depth,
		});
		const bulkheadMeshSource = makeBulkheadMeshSource({
			bulkhead: opts.bulkhead,
			outline: bulkheadOutlineSource
		});

		const cg = construct(generate);
		const bulkhead = cg(bulkheadMeshSource);

		bulkhead.lookAt(outside1.clone().sub(v1));
		bulkhead.rotateY(0.5 * Math.PI);

		corner.add(bulkhead);
		/*
		const bulkheadOutline = buildBulkheadOutline({
			width: opts.width,
			height: opts.height,
			wallDepth: opts.wall.depth,
			wallProfile: buildWallProfile(wallProfileOpts),
			ceilingDepth: opts.ceiling.depth,
			ceilingProfile: buildCeilingProfile(ceilingProfileOpts),
		});
		*/
		/*
		const bulkheadMeshSource = createSource(makeBulkheadMesh);
		const bulkheadMesh = bulkheadMeshSource({
			seed: 0,
			width: 3,
			height: 2,
			wall,
			ceiling,
			floor,
			bulkhead
		});
		console.log(bulkheadMesh);
		*/
		/*
		const frontBulkhead = generate(bulkheadMesh);
		frontBulkhead.position.set(0, 0, -0.5 * bulkhead.thickness);
		corridor.add(frontBulkhead);
		const rearBulkhead = generate(bulkheadMesh);
		rearBulkhead.position.set(0, 0, -length + 0.5 * bulkhead.thickness);
		corridor.add(rearBulkhead);
		*/
	

	return corner;
};



/*
function testGenerators(root) {
	const wallMaterial = new THREE.MeshPhongMaterial({color: 0xffff00});
	const ceilingMaterial = new THREE.MeshPhongMaterial({color: 0x0000ff});
	const floorMaterial = new THREE.MeshPhongMaterial({color: 0x00ff00});
	const bulkheadMaterial = new THREE.MeshPhongMaterial({color: 0x333333});
	const corridorGenerator = {generator: makeCorridor, opts: {
		seed: 3,
		width: 2,
		height: 3,
		length: 5,
		wall: {segments: 7, depth: 0.2, material: wallMaterial},
		ceiling: {segments: 7, depth: 0.2, material: ceilingMaterial},
		floor: {segments: 3, depth: 0.1, material: floorMaterial},
		bulkhead: {
			depth: 0.075,
			thickness: 0.2,
			bevelDepth: 0.1,
			bevelSize: 0.1,
			material: bulkheadMaterial,
		}
	}};
	const corridorA = generate(corridorGenerator);
	const corridorB = generate(corridorGenerator);
	corridorA.position.set(0, 1, 0);
	root.add(corridorA);
	corridorB.position.set(5, 1, 0);
	root.add(corridorB);
}
*/

module.exports = {
	generate,
	generators: {
		makeCorridor
	},
	computeCornerData,
	computeSegmentData,
	buildCornerSegment,
	wrapGenerator,
	createGenerator,
	makeProfile,
	makeOutlineFromProfile,
	makeWallMesh,
};

})();