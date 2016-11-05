(function() {
const createRng = require('portable-rng');
const THREE = require('THREE');
const {
	Shape, ExtrudeGeometry
} = require('THREE');


const MAT4_MIRRORX = new THREE.Matrix4();
	MAT4_MIRRORX.elements[0] = -1;
	MAT4_MIRRORX.elements[10] = -1;
	MAT4_MIRRORX.elements[14] = -1;
const MAT4_MIRRORY = new THREE.Matrix4();
	MAT4_MIRRORY.elements[5] = -1;
	MAT4_MIRRORY.elements[10] = -1;
	MAT4_MIRRORY.elements[14] = -1;


// Generator classes
	class GeneratorBase {
		constructor(seed) {
			this.rng = createRng(seed);
		}
		generateProfile(maxSegments, symmetrical = false) {
			const rng = this.rng;
			const numPoints = Math.floor(rng() * maxSegments);
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
		}
	}
	class ProfileGenerator extends GeneratorBase {
		constructor(seed) {
			super(seed);
			this.profile = undefined;
		}
		generate(segments, symmetrical = false) {
			const rng = this.rng;
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
			this.profile = points;
			return this;
		}
		getOutline() {
			const points = this.profile.map((p) => ({x: -p.y, y: p.x}));
			const outline =
				[{x: 0, y: 1}, {x: -1, y: 1}, {x: -1, y: 0}, {x: 0, y: 0}]
				.concat(points)
				.map(({x, y}) => new THREE.Vector3(x, y, 0));
			return outline;
		}
	}

	class BuilderBase {
		constructor() {
			this.opts = null;
			this.cacheHash = null;
			this.geometry = null;
		}
		generateGeometry(opts) {
			throw new Error('Abstract: not implemented');
		}
		generate(opts) {
			const cacheHash = JSON.stringify(opts);
			if(this.cacheHash !== cacheHash) {
				this.opts = opts;
				this.geometry = this.generateGeometry(opts);
				this.cacheHash = cacheHash;
				this.postProcess();
			}
			return this.geometry;
		}
		postProcess() {
			if(typeof this.onPostProcess === 'function') {
				this.geometry = this.onPostProcess(this.geometry);
			}
		}
		copy(builder) {
			Object.assign(this, builder);
			this.generateGeometry = builder.generateGeometry;
			this.postProcess();
		}
	}
	class WallBuilder extends BuilderBase {
		generateGeometry({seed, segments, extrude}) {
			const profileGen = new ProfileGenerator(seed).generate(segments);
			this.profile = profileGen.profile;
			const outline = profileGen.getOutline();
			const shape =  new Shape(outline);
			const geometry = new ExtrudeGeometry(shape, extrude);
			geometry.translate(0, 0, -1);
			return geometry;
		}
	}
	class CeilingBuilder extends BuilderBase {
		generateGeometry({seed, segments, extrude}) {
			const profileGen = new ProfileGenerator(seed).generate(segments, true);
			this.profile = profileGen.profile;
			const outline = profileGen.getOutline();
			const shape =  new Shape(outline);
			const geometry = new ExtrudeGeometry(shape, extrude);
			geometry.rotateZ(-0.5 * Math.PI);
			geometry.translate(-0.5, 0, -1);
			return geometry;
		}
	}

	class AssemblerBase {
	}
	class CorridorAssembler extends AssemblerBase {
		constructor() {
			super();
			this.leftWall = new WallBuilder();
			this.rightWall = new WallBuilder();
			this.rightWall.onPostProcess = (geo) => geo.clone().applyMatrix(MAT4_MIRRORX);
			this.ceiling = new CeilingBuilder();
			this.floor = new CeilingBuilder();
			this.floor.onPostProcess = (geo) => geo.clone().applyMatrix(MAT4_MIRRORY);
			this.seeds = {};
		}
		setSeed({seed, wall, ceiling, floor}) {
			const rng = createRng(seed);
			const seeds = [rng(), rng(), rng()];
			this.seeds.seed = seed;
			this.seeds.wall = wall && wall.seed || seeds[0];
			this.seeds.ceiling = ceiling && ceiling.seed || seeds[1];
			this.seeds.floor = floor && floor.seed || seeds[2];
			return this;
		}
		generate({wall, ceiling, floor, bulkhead}) {
			const extrudeOpts = {amount: 1, bevelEnabled: false};
			const wallOpts = {seed: this.seeds.wall, segments: wall.segments, extrude: extrudeOpts};
			const ceilingOpts = {seed: this.seeds.ceiling, segments: ceiling.segments, extrude: extrudeOpts};
			const floorOpts = {seed: this.seeds.floor, segments: floor.segments, extrude: extrudeOpts};
			this.leftWall.generate(wallOpts);
			this.rightWall.copy(this.leftWall);
			this.ceiling.generate(ceilingOpts);
			this.floor.generate(floorOpts);
			const bulkheadShape = new Shape(this.getBulkheadOutline(arguments[0]));
			this.bulkheadGeometry = new ExtrudeGeometry(bulkheadShape, bulkhead.bevel);
			this.bulkheadGeometry.translate(0, 0, -0.5 * bulkhead.bevel.amount);
		}
		getBulkheadOutline({width, height, wall, ceiling, floor, bulkhead}) {
			const wd = wall.depth;
			const cd = ceiling.depth;
			const fd = floor.depth;
			const bd = bulkhead.depth;
			const filterWall = (p) => p.x < 1 - (bd / height);
			const filterCeiling = (p) => p.x > (bd / width) && p.x < 1 - (bd / width);
			const x = 0.5 * width;
			const y = height;
			return [].concat(
				[{x: -x + bd, y: -fd}, {x: -x + bd, y: 0}],
				this.leftWall.profile
					.filter(filterWall)
					.map((p) => ({x: -x - p.y * wd + bd, y: p.x * height}))
				,
				[{x: -x + bd, y: y - bd}],
				this.ceiling.profile
					.filter(filterCeiling)
					.map((p) => ({x: -x + p.x * width, y: y + p.y * cd - bd})),
				[{x: x - bd, y: y - bd}],
				this.rightWall.profile
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
		}
		buildLeftWall({wall, width, height, length}) {
			const mesh = new THREE.Mesh(this.leftWall.geometry, wall.material);
			mesh.name = 'leftWall';
			mesh.scale.set(wall.depth, height, length);
			mesh.position.set(-0.5 * width, 0, 0);
			return mesh;
		}
		buildRightWall({wall, width, height, length}) {
			const mesh = new THREE.Mesh(this.rightWall.geometry, wall.material);
			mesh.name = 'rightWall';
			mesh.scale.set(wall.depth, height, length);
			mesh.position.set(0.5 * width, 0, 0);
			return mesh;
		}
		__buildCeiling({ceiling, width, height, length}) {
			const mesh = new THREE.Mesh(this.ceiling.geometry, ceiling.material);
			mesh.name = 'ceiling';
			mesh.scale.set(width, ceiling.depth, length);
			mesh.position.set(0, height, 0);
			return mesh;
		}
		__buildFloor({floor, width, height, length}) {
			const mesh = new THREE.Mesh(this.floor.geometry, floor.material);
			mesh.name = 'floor';
			mesh.scale.set(width, floor.depth, length);
			mesh.position.set(0, 0, 0);
			return mesh;
		}
		buildBulkhead({bulkhead}) {
			const mesh = new THREE.Mesh(this.bulkheadGeometry, bulkhead.material);
			mesh.name = 'bulkhead';
			return mesh;
		}
		__buildCorridor({width, height, length, wall, ceiling, floor, bulkhead}) {
			const corridor = new THREE.Object3D();
			corridor.add(this.buildLeftWall(arguments[0]));
			corridor.add(this.buildRightWall(arguments[0]));
			corridor.add(this.buildCeiling(arguments[0]));
			corridor.add(this.buildFloor(arguments[0]));
			if(bulkhead && bulkhead.enabled !== false) {
				const frontBulkhead = this.buildBulkhead(arguments[0]);
				frontBulkhead.position.set(0, 0, -0.5 * bulkhead.bevel.amount);
				corridor.add(frontBulkhead);
				const rearBulkhead = this.buildBulkhead(arguments[0]);
				rearBulkhead.position.set(0, 0, -length + 0.5 * bulkhead.bevel.amount);
				corridor.add(rearBulkhead);
			}
			return corridor;
		}
	}


module.exports = {
	CorridorAssembler
};

})();