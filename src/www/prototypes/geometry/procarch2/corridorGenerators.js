(() => {
const {Vector3, Shape, Object3D, ExtrudeGeometry, Mesh} = require('THREE');
const {make} = require('ConstructionKit');
const {
	makeProfile,
	makeShapeFromProfile,
	makeExtrudedProfile,
} = require('basicGenerators');

// Wall
	const makeWallGeometry = ({seed, segments}, context)  => {
		const geometry = makeExtrudedProfile({profile: makeProfile({seed, segments, symmetrical: false}, context)});
		geometry.rotateX(0.5 * Math.PI);
		geometry.rotateZ(0.5 * Math.PI);
		geometry.translate(-0.5, 0, -1);
		return geometry;
	};
// Ceiling
	const makeCeilingGeometry = ({seed, segments}, context) => {
		const geometry = makeExtrudedProfile({profile: makeProfile({seed, segments, symmetrical: true}, context)});
		geometry.translate(-0.5, -1, -0.5);
		geometry.rotateZ(Math.PI);
		return geometry;
	};
// Floor
	const makeFloorGeometry = ({seed, segments}, context) => {
		const geometry = makeExtrudedProfile({profile: makeProfile({seed, segments, symmetrical: true}, context)});
		geometry.translate(-0.5, -1, -0.5);
		return geometry;
	};
// Bulkhead
	const makeBulkheadShape = ({width, height, wall, ceiling, floor, bulkhead}, context) => {
		const wd = wall.depth;
		const cd = ceiling.depth;
		const fd = floor.depth;
		const bd = bulkhead.depth;
		const filterWall = (p) => p.x < 1 - (bd / height);
		const filterCeiling = (p) => p.x > (bd / width) && p.x < 1 - (bd / width);
		const wallProfile = makeProfile({seed: wall.seed, segments: wall.segments, symmetrical: false}, context);
		const ceilingProfile = makeProfile({seed: ceiling.seed, segments: ceiling.segments, symmetrical: true}, context);
		const x = 0.5 * width;
		const y = height;
		return new Shape([].concat(
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
		.map(({x, y}) => new Vector3(x, y, 0)));
	};
	const makeBulkhead = ({wall, ceiling, floor, bulkhead, width, height}, context) => {
		const shape = makeBulkheadShape({wall, ceiling, floor, bulkhead, width, height}, context);
		const geometry =  new ExtrudeGeometry(shape, bulkhead.bevel);
		geometry.translate(0, 0, 0.5 * bulkhead.bevel.amount);
		const mesh = new Mesh(geometry, bulkhead.material);
		mesh.name = 'bulkhead';
		return mesh;
	};
// Corridor
	const makeCorridorWall = ({wall, height, length}, context) => {
		const geometry = makeWallGeometry(wall, context);
		const mesh = new Mesh(geometry, wall.material);
		mesh.scale.set(length, height, wall.depth);
		return mesh;
	};
	const makeLeftWall = ({wall, width, height, length}, context) => {
		const mesh = makeCorridorWall({wall, height, length}, context);
		mesh.name = 'leftWall';
		mesh.position.set(-0.5 * width, 0, 0);
		mesh.rotation.set(0, 0.5 * Math.PI, 0);
		return mesh;
	};
	const makeRightWall = ({wall, width, height, length}, context) => {
		const mesh = makeCorridorWall({wall, height, length}, context);
		mesh.name = 'rightWall';
		mesh.position.set(0.5 * width, 0, 0);
		mesh.rotation.set(0, -0.5 * Math.PI, 0);
		return mesh;
	};
	const makeCeiling = ({ceiling, width, height, length}, context) => {
		const geometry = makeCeilingGeometry(ceiling, context);
		const mesh = new Mesh(geometry, ceiling.material);
		mesh.scale.set(width, ceiling.depth, length);
		mesh.position.set(0, height, 0);
		return mesh;
	};
	const makeFloor = ({floor, width, height, length}, context) => {
		const geometry = makeFloorGeometry(floor, context);
		const mesh = new Mesh(geometry, floor.material);
		mesh.scale.set(width, floor.depth, length);
		return mesh;
	};
	const makeCorridor = ({wall, ceiling, floor, width, height, length}, context) => {
		const corridor = new Object3D();
		corridor.add(makeLeftWall({wall, width, height, length}, context));
		corridor.add(makeRightWall({wall, width, height, length}, context));
		corridor.add(makeCeiling({ceiling, width, height, length}, context));
		corridor.add(makeFloor({floor, width, height, length}, context));
		return corridor;
	};

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		makeWallGeometry,
		makeCeilingGeometry,
		makeFloorGeometry,
		makeCorridorWall,
		makeLeftWall,
		makeRightWall,
		makeBulkhead,
		makeCorridor,
	};
	module.exports.corridorGenerators = module.exports;
}
})();