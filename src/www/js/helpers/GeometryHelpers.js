(function() {
/* jshint validthis: true */
'use strict';
var THREE = require('THREE');


function extrudePath(points, segments, uvRepeat, scale) {
	segments = segments || 10;
	uvRepeat = uvRepeat || 1;
	scale = scale || 1;
	if(!Array.isArray(points)) {
		points = points.getSpacedPoints(segments);
	} else {
		points = points.slice();
	}
	points.push(points[0]); // Close curve
	var geo = new THREE.Geometry();
	var len = points.length;
	var uvSeg = (1 / (points.length - 1)) * uvRepeat;
	var uvx1 = 0, uvx2 = 0;
	for(var i = 0, l = points.length; i < l; i++) {
		var p = points[i];
		geo.vertices.push(new THREE.Vector3(p.x, p.y, 0.0));
		geo.vertices.push(new THREE.Vector3(p.x * scale, p.y * scale, 1.0));
		if(i > 0) {
			var a = i * 2 - 2;
			var b = i * 2;
			var c = i * 2 + 1;
			var d = i * 2 - 1;
			var uvx = (i - 1) * uvSeg % 1;
			var uvs = [
				new THREE.Vector2(uvx, 0.0),
				new THREE.Vector2(uvx + uvSeg, 0.0),
				new THREE.Vector2(uvx + uvSeg, 1.0),
				new THREE.Vector2(uvx, 1.0),
			];
			uvx1 = uvx2;
			geo.faces.push(new THREE.Face3(a, d, b));
			geo.faces.push(new THREE.Face3(b, d, c));
			geo.faceVertexUvs[0].push([uvs[0], uvs[3], uvs[1]]);
			geo.faceVertexUvs[0].push([uvs[1], uvs[3], uvs[2]]);
		}
	}
	geo.verticesNeedUpdate = true;
	geo.elementsNeedUpdate = true;
	geo.uvsNeedUpdate = true;
	geo.computeVertexNormals();
	geo.computeFaceNormals();
	return geo;
}

function radialSort(points) {
	var i, len = points.length, pv;
	var mid = new THREE.Vector3();
	var up = new THREE.Vector3(0, 1, 0);
	var sortData = [], res = [];
	for(i = 0; i < len; i++) {
		mid.add(points[i]);
		sortData[i] = {idx: i, a: 0};
	}
	mid.multiplyScalar(1 / len);
	for(i = 0; i < len; i++) {
		pv = mid.clone().sub(points[i]);
		sortData[i].a = up.angleTo(pv);
		if(pv.x < 0) sortData[i].a *= -1; // clockwise vs counter-clockwise
	}
	sortData = sortData.sort(function(a, b) { return b.a - a.a; });
	for(i = 0; i < len; i++) res[i] = points[sortData[i].idx];
	return res;
}

function optimizeOutline(outline, angThreshold, distThreshold) {
	var optimized = [];
	var i, a, b, c, ab, bc;
	var len = outline.length;
	if(angThreshold === undefined) angThreshold = 1;
	if(distThreshold === undefined) distThreshold = 0.001;
	angThreshold = angThreshold * Math.PI / 180;
	i = 0;
	a = outline[i];
	do {
		b = outline[i++];
		ab = b.clone().sub(a);
	} while (ab.length() <= distThreshold);
	optimized.push(a);
	while(i < len) {
		do {
			c = outline[i++];
			bc = c.clone().sub(b);
		} while ((i < len) && (bc.length() <= distThreshold));
		if(ab.angleTo(bc) <= angThreshold) {
			b = c;
			ab = b.clone().sub(a);
		} else {
			optimized.push(b);
			a = b;
			b = c;
			ab = b.clone().sub(a);
		}
	}
	//a = optimized[optimized.length - 1];
	//b = outline[outline.length - 1];
	//ab = b.clone().sub(a);
	//if(ab.length() > distThreshold) optimized.push(b);
	return optimized;
}
function normalizeUVs(geometry, min, max, offset) {
	geometry.computeBoundingBox();
	min = min || geometry.boundingBox.min;
	max = max || geometry.boundingBox.max;
	//var offset = new THREE.Vector2(0 - min.x + (offset.x || 0), 0 - min.y + (offset.y || 0));
	offset.x -= min.x;
	offset.y -= min.y;
	var range = new THREE.Vector2(max.x - min.x, max.y - min.y);
	geometry.faceVertexUvs[0] = [];
	var faces = geometry.faces;
	for (var i = 0, l = geometry.faces.length; i < l; i++) {
		var v1 = geometry.vertices[faces[i].a];
		var v2 = geometry.vertices[faces[i].b];
		var v3 = geometry.vertices[faces[i].c];
		geometry.faceVertexUvs[0].push([
			new THREE.Vector2((v1.x + offset.x) / range.x, (v1.y + offset.y) / range.y),
			new THREE.Vector2((v2.x + offset.x) / range.x, (v2.y + offset.y) / range.y),
			new THREE.Vector2((v3.x + offset.x) / range.x, (v3.y + offset.y) / range.y)
		]);
	}
	geometry.uvsNeedUpdate = true;
}

// Convex hull algorithm: convexHull(pointset, concavity, format);
var convexHull = (function() {
	// intersect
		function ccw(x1, y1, x2, y2, x3, y3) {           
			var cw = ((y3 - y1) * (x2 - x1)) - ((y2 - y1) * (x3 - x1));
			return cw > 0 ? true : cw < 0 ? false : true; // colinear
		}
		function intersect(seg1, seg2) {
			var x1 = seg1[0][0], y1 = seg1[0][1],
			x2 = seg1[1][0], y2 = seg1[1][1],
			x3 = seg2[0][0], y3 = seg2[0][1],
			x4 = seg2[1][0], y4 = seg2[1][1];
			return ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) && ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4);
		}

	// grid
		function Grid(points, cellSize) {
			this._cells = [];
			this._cellSize = cellSize;
			points.forEach(function(point) {
				var cellXY = this.point2CellXY(point),
				x = cellXY[0],
				y = cellXY[1];
				if (this._cells[x] === undefined) {
					this._cells[x] = [];
				}
				if (this._cells[x][y] === undefined) {
					this._cells[x][y] = [];
				}
				this._cells[x][y].push(point);
			}, this);
		}
		Grid.prototype = {
			cellPoints: function(x, y) { // (Number, Number) -> Array
				return (this._cells[x] !== undefined && this._cells[x][y] !== undefined) ? this._cells[x][y] : [];
			},
			rangePoints: function(bbox) { // (Array) -> Array
				var tlCellXY = this.point2CellXY([bbox[0], bbox[1]]),
				brCellXY = this.point2CellXY([bbox[2], bbox[3]]),
				points = [];
				for (var x = tlCellXY[0]; x <= brCellXY[0]; x++) {
					for (var y = tlCellXY[1]; y <= brCellXY[1]; y++) {
						points = points.concat(this.cellPoints(x, y));
					}
				}
				return points;
			},
			removePoint: function(point) { // (Array) -> Array
				var cellXY = this.point2CellXY(point),
				cell = this._cells[cellXY[0]][cellXY[1]],
				pointIdxInCell;
				for (var i = 0; i < cell.length; i++) {
					if (cell[i][0] === point[0] && cell[i][1] === point[1]) {
						pointIdxInCell = i;
						break;
					}
				}
				cell.splice(pointIdxInCell, 1);
				return cell;
			},
			point2CellXY: function(point) { // (Array) -> Array
				var x = parseInt(point[0] / this._cellSize),
					y = parseInt(point[1] / this._cellSize);
				return [x, y];
			},
			extendBbox: function(bbox, scaleFactor) { // (Array, Number) -> Array
				return [
				bbox[0] - (scaleFactor * this._cellSize),
				bbox[1] - (scaleFactor * this._cellSize),
				bbox[2] + (scaleFactor * this._cellSize),
				bbox[3] + (scaleFactor * this._cellSize)
				];
			}
		};
		function grid(points, cellSize) {
			return new Grid(points, cellSize);
		}

	// formatUtil
		var formatUtil = {
			toXy: function(pointset, format) {
				if (format === undefined) {
					return pointset;
				}
				return pointset.map(function(pt) {
					/*jslint evil: true */
					var _getXY = new Function('pt', 'return [pt' + format[0] + ',' + 'pt' + format[1] + '];');
					return _getXY(pt);
				});
			},
			fromXy: function(pointset, format) {
				if (format === undefined) {
					return pointset;
				}
				return pointset.map(function(pt) {
					/*jslint evil: true */
					var _getObj = new Function('pt', 'var o = {}; o' + format[0] + '= pt[0]; o' + format[1] + '= pt[1]; return o;');
					return _getObj(pt);
				});
			}
		};

	// convexHull
		function _cross(o, a, b) {
			return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
		}
		function _upperTangent(pointset) {
			var lower = [];
			for (var l = 0; l < pointset.length; l++) {
				while (lower.length >= 2 && (_cross(lower[lower.length - 2], lower[lower.length - 1], pointset[l]) <= 0)) {
					lower.pop();
				}
				lower.push(pointset[l]);
			}
			lower.pop();
			return lower;
		}
		function _lowerTangent(pointset) {
			var reversed = pointset.reverse(),
			upper = [];
			for (var u = 0; u < reversed.length; u++) {
				while (upper.length >= 2 && (_cross(upper[upper.length - 2], upper[upper.length - 1], reversed[u]) <= 0)) {
					upper.pop();
				}
				upper.push(reversed[u]);
			}
			upper.pop();
			return upper;
		}
		// pointset has to be sorted by X
		function convexHull(pointset) {
			var upper = _upperTangent(pointset);
			var lower = _lowerTangent(pointset);
			var convex = lower.concat(upper);
			convex.push(pointset[0]);  
			return convex;  
		}

	function _sortByX(pointset) {
		return pointset.sort(function(a, b) {
			if (a[0] == b[0]) {
				return a[1] - b[1];
			} else {
				return a[0] - b[0];
			}
		});
	}
	function _sqLength(a, b) {
		return Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2);
	}
	function _cos(o, a, b) {
		var aShifted = [a[0] - o[0], a[1] - o[1]],
		bShifted = [b[0] - o[0], b[1] - o[1]],
		sqALen = _sqLength(o, a),
		sqBLen = _sqLength(o, b),
		dot = aShifted[0] * bShifted[0] + aShifted[1] * bShifted[1];
		return dot / Math.sqrt(sqALen * sqBLen);
	}
	function _intersect(segment, pointset) {
		for (var i = 0; i < pointset.length - 1; i++) {
			var seg = [pointset[i], pointset[i + 1]];
			if (segment[0][0] === seg[0][0] && segment[0][1] === seg[0][1] ||
				segment[0][0] === seg[1][0] && segment[0][1] === seg[1][1]) {
				continue;
			}
			if (intersect(segment, seg)) {
				return true;
			}
		}
		return false;
	}
	function _occupiedArea(pointset) {
		var minX = Infinity, minY = Infinity,
			maxX = -Infinity, maxY = -Infinity;
		for (var i = pointset.length - 1; i >= 0; i--) {
			if (pointset[i][0] < minX) minX = pointset[i][0];
			if (pointset[i][1] < minY) minY = pointset[i][1];
			if (pointset[i][0] > maxX) maxX = pointset[i][0];
			if (pointset[i][1] > maxY) maxY = pointset[i][1];
		}
		return [maxX - minX, maxY - minY];
	}
	function _bBoxAround(edge) {
		return [
			Math.min(edge[0][0], edge[1][0]), // left
			Math.min(edge[0][1], edge[1][1]), // top
			Math.max(edge[0][0], edge[1][0]), // right
			Math.max(edge[0][1], edge[1][1])  // bottom
		];
	}
	function _midPoint(edge, innerPoints, convex) {
		var point = null,
		angle1Cos = MAX_CONCAVE_ANGLE_COS,
		angle2Cos = MAX_CONCAVE_ANGLE_COS,
		a1Cos, a2Cos;
		for (var i = 0; i < innerPoints.length; i++) {
			a1Cos = _cos(edge[0], edge[1], innerPoints[i]);
			a2Cos = _cos(edge[1], edge[0], innerPoints[i]);
			if (a1Cos > angle1Cos && a2Cos > angle2Cos &&
				!_intersect([edge[0], innerPoints[i]], convex) &&
				!_intersect([edge[1], innerPoints[i]], convex)) {
				angle1Cos = a1Cos;
				angle2Cos = a2Cos;
				point = innerPoints[i];
			}
		}
		return point;
	}
	function _concave(convex, maxSqEdgeLen, maxSearchArea, grid, edgeSkipList) {
		var edge,
		keyInSkipList,
		scaleFactor,
		midPoint,
		bBoxAround,
		bBoxWidth,
		bBoxHeight,
		midPointInserted = false;
		for (var i = 0; i < convex.length - 1; i++) {
			edge = [convex[i], convex[i + 1]];
			keyInSkipList = edge[0].join() + ',' + edge[1].join();
			if (_sqLength(edge[0], edge[1]) < maxSqEdgeLen || edgeSkipList[keyInSkipList] === true) continue;
			scaleFactor = 0;
			bBoxAround = _bBoxAround(edge);
			do {
				bBoxAround = grid.extendBbox(bBoxAround, scaleFactor);
				bBoxWidth = bBoxAround[2] - bBoxAround[0];
				bBoxHeight = bBoxAround[3] - bBoxAround[1];
				midPoint = _midPoint(edge, grid.rangePoints(bBoxAround), convex);            
				scaleFactor++;
			}  while (midPoint === null && (maxSearchArea[0] > bBoxWidth || maxSearchArea[1] > bBoxHeight));
			if (bBoxWidth >= maxSearchArea[0] && bBoxHeight >= maxSearchArea[1]) {
				edgeSkipList[keyInSkipList] = true;
			}
			if (midPoint !== null) {
				convex.splice(i + 1, 0, midPoint);
				grid.removePoint(midPoint);
				midPointInserted = true;
			}
		}
		if (midPointInserted) {
			return _concave(convex, maxSqEdgeLen, maxSearchArea, grid, edgeSkipList);
		}
		return convex;
	}
	function hull(pointset, concavity, format) {
		var convex,
			concave,
			innerPoints,
			occupiedArea,
			maxSearchArea,
			cellSize,
			maxEdgeLen = concavity || 20;
		if (pointset.length < 4) return pointset;
		pointset = _sortByX(formatUtil.toXy(pointset, format));
		occupiedArea = _occupiedArea(pointset);
		maxSearchArea = [
			occupiedArea[0] * MAX_SEARCH_BBOX_SIZE_PERCENT,
			occupiedArea[1] * MAX_SEARCH_BBOX_SIZE_PERCENT
		];
		convex = convexHull(pointset);
		innerPoints = pointset.filter(function(pt) { return convex.indexOf(pt) < 0; });
		cellSize = Math.ceil(1 / (pointset.length / (occupiedArea[0] * occupiedArea[1])));
		concave = _concave(
			convex, Math.pow(maxEdgeLen, 2),
			maxSearchArea, grid(innerPoints, cellSize), {}
		);
		return formatUtil.fromXy(concave, format);
	}

	var MAX_CONCAVE_ANGLE_COS = Math.cos(90 / (180 / Math.PI)); // angle = 90 deg
	var MAX_SEARCH_BBOX_SIZE_PERCENT = 0.6;

	return function convexHull(points, concavity, format) {
		points = points.map(function(p) {
			if(Array.isArray(p)) return p;
			if(p.x !== undefined && p.y !== undefined) return [p.x, p.y];
			return p;
		});
		return hull(points, concavity, format);
	};
})();


function GeometryHelpers(){}
GeometryHelpers.prototype = Object.create(null);
GeometryHelpers.prototype.constructor = GeometryHelpers;


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = GeometryHelpers;
	module.exports.extrudePath = extrudePath;
	module.exports.radialSort = radialSort;
	module.exports.optimizeOutline = optimizeOutline;
	module.exports.normalizeUVs = normalizeUVs;
	module.exports.convexHull = convexHull;
}
})();