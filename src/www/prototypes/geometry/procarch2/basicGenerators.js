(() => {
//const createRng = require('portable-rng');
const {Vector3, Shape, ExtrudeGeometry} = require('THREE');

// Generators
	const makeProfile = ({seed, segments, symmetrical}, context) => {
		const rng = context.createRng(seed);
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
// Helpers
	const makeShapeFromProfile = ({profile}, context) => new Shape(
		[{x: 1, y: 1}, {x: 1, y: 0}, {x: 0, y: 0}, {x: 0, y: 1}]
			.concat(profile.map(({x, y}) => ({x: x, y: 1 - y})))
			.map(({x, y}) => new Vector3(x, y, 0))
	);
	const makeExtrudedProfile = ({profile}, context) => {
		const extrudeOpts = {amount: 1, bevelEnabled: false};
		const shape = makeShapeFromProfile({profile}, context);
		return new ExtrudeGeometry(shape, extrudeOpts);
	};


if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = {
		makeProfile,
		makeShapeFromProfile,
		makeExtrudedProfile,
	};
	module.exports.basicGenerators = module.exports;

}
})();