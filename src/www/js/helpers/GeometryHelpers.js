(function() {
/* jshint validthis: true */
'use strict';
var THREE = require('THREE');

// Geometry
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

	function getSpacedPointsWithCorners(curvePath, divisions) {
		var points = [];
		var curves = curvePath.curves;
		var curveCount = curves.length;
		var curveLengths = [];
		var totalLength = 0;
		var i, curveDivisions, curvePoints;
		for(i = 0; i < curveCount; i++) {
			curveLengths[i] = curves[i].getLength();
			totalLength += curveLengths[i];
		}
		var currentLength = 0;
		for(i = 0; i < curveCount; i++) {
			currentLength += curveLengths[i];
			curveDivisions = Math.round(currentLength * divisions / totalLength - points.length);
			curveDivisions = Math.max(1, curveDivisions);
			curvePoints = curves[i].getSpacedPoints(curveDivisions);
			if(i < curveCount-1) curvePoints.length--;
			points = points.concat(curvePoints);
		}
		// Trim last point if it is equal to first
		if(points[0].distanceToSquared(points[points.length-1]) < Number.EPSILON) points.length--;
		return points;
	}

	function extrudeProfileOnPath(profileVs, outlineVs, sharedUVs) {
		/*
			TODO:
			- if sharedUVs == false, create multiple UV layers
			- Smooth according to edge angles
			- Accept Shapes/CurvePaths directly
			- Don't scale UVs along profile. Reuse reference profile
		*/
		var upVector = new THREE.Vector3(0, 1, 0);
		var backVector = new THREE.Vector3(0, 0, -1);
		var outlineCount = outlineVs.length;
		var profileCount = profileVs.length;
		var profileVertices, verticeIndices, outlineLengths, profileLengths, uvs;
		var geo = new THREE.Geometry();
		var uvLayer = 0;
		function capFront() {
			var i, a, b, c = geo.vertices.length;
			// Calculate bounds
				var bounds = new THREE.Box3();
				for(i = 0; i < outlineCount; i++) {
					a = (i + 1) * profileCount - 1;
					bounds.expandByPoint(geo.vertices[a]);
				}
				geo.vertices.push(bounds.center());
			// Faces and UVs
				var size = bounds.size();
				var center = bounds.center();
				var uvOffset = new THREE.Vector2(0.5, 0.5);
				var centerOffset = new THREE.Vector2(center.x, - center.y);
				var uvScale = new THREE.Vector2(1 / size.x, 1 / size.y);
				if(sharedUVs) {
					uvScale.multiplyScalar(0.5);
					uvOffset.add(new THREE.Vector2(-0.25, 0.25));
				}
				for(i = 0; i < outlineCount; i++) {
					a = (i + 1) * profileCount - 1;
					b = (((i + 1) % outlineCount) + 1) * profileCount - 1;
					geo.faces.push(new THREE.Face3(a, c, b));
					geo.faceVertexUvs[uvLayer][geo.faces.length - 1] = [
						geo.vertices[a].clone().add(centerOffset).multiply(uvScale).add(uvOffset),
						geo.vertices[c].clone().add(centerOffset).multiply(uvScale).add(uvOffset),
						geo.vertices[b].clone().add(centerOffset).multiply(uvScale).add(uvOffset)
					];
				}
		}
		function capBack() {
			var i, a, b, c = geo.vertices.length;
			// Calculate bounds
				var bounds = new THREE.Box3();
				for(i = 0; i < outlineCount; i++) {
					a = i * profileCount;
					bounds.expandByPoint(geo.vertices[a]);
				}
				geo.vertices.push(bounds.center());
			// Faces and UVs
				var size = bounds.size();
				var center = bounds.center();
				var uvOffset = new THREE.Vector2(0.5, 0.5);
				var centerOffset = new THREE.Vector2(center.x, - center.y);
				var uvScale = new THREE.Vector2(-1 / size.x, 1 / size.y);
				if(sharedUVs) {
					uvScale.multiplyScalar(0.5);
					uvOffset.add(new THREE.Vector2(0.25, 0.25));
				}
				for(i = 0; i < outlineCount; i++) {
					a = i * profileCount;
					b = ((i + 1) % outlineCount) * profileCount;
					geo.faces.push(new THREE.Face3(a, b, c));
					geo.faceVertexUvs[uvLayer][geo.faces.length - 1] = [
						geo.vertices[a].clone().add(centerOffset).multiply(uvScale).add(uvOffset),
						geo.vertices[b].clone().add(centerOffset).multiply(uvScale).add(uvOffset),
						geo.vertices[c].clone().add(centerOffset).multiply(uvScale).add(uvOffset)
					];
				}
		}
		function computeOutlineLengths() {
			outlineLengths = [];
			for(var pIdx = 0; pIdx < profileCount; pIdx++) {
				outlineLengths[pIdx] = 0;
				for(var oIdx = 0; oIdx < outlineCount; oIdx++) {
					var dist = profileVertices[oIdx][pIdx]
						.distanceTo(profileVertices[(oIdx+1) % outlineCount][pIdx]);
					outlineLengths[pIdx] += dist;
				}
			}
		}
		function computeProfileLengths() {
			profileLengths = [];
			for(var oIdx = 0; oIdx < outlineCount; oIdx++) {
				profileLengths[oIdx] = 0;
				for(var pIdx = 0; pIdx < profileCount-1; pIdx++) {
					var dist = profileVertices[oIdx][pIdx]
						.distanceTo(profileVertices[oIdx][pIdx+1]);
					profileLengths[oIdx] += dist;
				}
			}
		}
		function createProfileVertices() {
			var oIdx, pIdx, vertex, v0, v1, v2, va, vb, vab, scaleV, ang, a, b, c;
			profileVertices = [];
			verticeIndices = [];
			for(oIdx = 0; oIdx < outlineCount; oIdx++) {
				a = (oIdx + outlineCount - 1) % outlineCount;
				b = oIdx;
				c = (oIdx + 1) % outlineCount;
				v0 = outlineVs[a].clone(); v0.z = 0;
				v1 = outlineVs[b].clone(); v1.z = 0;
				v2 = outlineVs[c].clone(); v2.z = 0;
				va = v1.clone().sub(v0).normalize();
				vb = v2.clone().sub(v1).normalize();
				vab = va.clone().add(vb).normalize();
				vab.set(-vab.y, vab.x, vab.z); // Rotate by 90 degrees clockwise
				ang = upVector.angleTo(vab); if(vab.x < 0) ang = -ang;
				scaleV = new THREE.Vector3(1, 1 / Math.sin(vab.angleTo(va)), 1);
				profileVertices[oIdx] = [];
				verticeIndices[oIdx] = [];
				for(pIdx = 0; pIdx < profileCount; pIdx++) {
					vertex = profileVs[profileCount - pIdx - 1].clone()
						.multiply(scaleV)
						.applyAxisAngle(backVector, ang)
						.add(outlineVs[oIdx]);
					profileVertices[oIdx][pIdx] = vertex;
					verticeIndices[oIdx][pIdx] = geo.vertices.push(vertex) - 1;
				}
			}
		}
		function computeUVs() {
			var oIdx, pIdx, uvA, uvB, uvC, uvD, a, b, c, d;
			uvs = [];
			for(oIdx = 0; oIdx <= outlineCount; oIdx++) {
				uvs[oIdx] = [];
				for(pIdx = 0; pIdx < profileCount; pIdx++) {
					uvs[oIdx][pIdx] = new THREE.Vector2(0, 0);
				}
			}
			for(oIdx = 0; oIdx < outlineCount; oIdx++) {
				for(pIdx = 0; pIdx < profileCount-1; pIdx++) {
					uvA = uvs[(oIdx + 0)][(pIdx + 0)];
					uvB = uvs[(oIdx + 1)][(pIdx + 0)];
					uvC = uvs[(oIdx + 1)][(pIdx + 1)];
					uvD = uvs[(oIdx + 0)][(pIdx + 1)];
					a = verticeIndices[(oIdx + 0) % outlineCount][(pIdx + 0) % profileCount];
					b = verticeIndices[(oIdx + 1) % outlineCount][(pIdx + 0) % profileCount];
					c = verticeIndices[(oIdx + 1) % outlineCount][(pIdx + 1) % profileCount];
					d = verticeIndices[(oIdx + 0) % outlineCount][(pIdx + 1) % profileCount];
					var ab = geo.vertices[a].distanceTo(geo.vertices[b]);
					uvB.x = uvA.x + ab;
					var ad = geo.vertices[a].distanceTo(geo.vertices[d]);
					uvD.y = uvA.y + ad;
					var dc = geo.vertices[d].distanceTo(geo.vertices[c]);
					var bc = geo.vertices[b].distanceTo(geo.vertices[c]);
					uvC.x = uvD.x + dc;
					uvC.y = uvB.y + bc;
				}
			}
			for(oIdx = 0; oIdx <= outlineCount; oIdx++) {
				for(pIdx = 0; pIdx < profileCount; pIdx++) {
					uvs[oIdx][pIdx].multiply(new THREE.Vector2(
						1 / outlineLengths[pIdx % profileCount],
						1 / profileLengths[oIdx % outlineCount]
					));
					uvs[oIdx][pIdx].y = 1 - uvs[oIdx][pIdx].y;
					if(sharedUVs) {
						uvs[oIdx][pIdx].multiply(new THREE.Vector2(1, 0.5));
					}
				}
			}
		}
		function createProfileFaces() {
			var oIdx, pIdx, segA, segB, a, b, c, d;
			var faceA, faceB, fIdxA, fIdxB;
			var uvA, uvB, uvC, uvD;
			for(oIdx = 0; oIdx < outlineCount; oIdx++) {
				for(pIdx = 0; pIdx < profileCount - 1; pIdx++) {
					a = verticeIndices[(oIdx + 0) % outlineCount][(pIdx + 0) % profileCount];
					b = verticeIndices[(oIdx + 1) % outlineCount][(pIdx + 0) % profileCount];
					c = verticeIndices[(oIdx + 1) % outlineCount][(pIdx + 1) % profileCount];
					d = verticeIndices[(oIdx + 0) % outlineCount][(pIdx + 1) % profileCount];
					faceA = new THREE.Face3(a, c, b);
					fIdxA = geo.faces.push(faceA) - 1;
					faceB = new THREE.Face3(a, d, c);
					fIdxB = geo.faces.push(faceB) - 1;
					// UVs
						uvA = uvs[(oIdx + 0)][(pIdx + 0)];
						uvB = uvs[(oIdx + 1)][(pIdx + 0)];
						uvC = uvs[(oIdx + 1)][(pIdx + 1)];
						uvD = uvs[(oIdx + 0)][(pIdx + 1)];
						geo.faceVertexUvs[uvLayer][fIdxA] = [uvA, uvC, uvB];
						geo.faceVertexUvs[uvLayer][fIdxB] = [uvA, uvD, uvC];
					
				}
			}
		}
		if(sharedUVs === undefined) sharedUVs = true;
		geo.faceVertexUvs[uvLayer] = [];
		createProfileVertices();
		computeOutlineLengths();
		computeProfileLengths();
		computeUVs();
		createProfileFaces();
		capFront(profileVs, outlineVs, geo);
		capBack(profileVs, outlineVs, geo);
		geo.uvsNeedUpdate = true;
		geo.computeFaceNormals();
		return geo;
	}

// models
	function geometryToJson(geo) {
		var json = {};
		var decimals = 5;
		function v2j(v) {
			if(v.z !== undefined)	return [Number(v.x.toFixed(decimals)),Number(v.y.toFixed(decimals)),Number(v.z.toFixed(decimals))];
			return [Number(v.x.toFixed(decimals)),Number(v.y.toFixed(decimals))];
		}
		json.uuid = geo.uuid;
		json.type = geo.type;
		var vs = geo.vertices;
		json.faces = geo.faces.map(function(f) {
			return [
				v2j(vs[f.a]),
				v2j(vs[f.b]),
				v2j(vs[f.c]),
				f.materialIndex,
				/*
				v2j(f.vertexNormals[0]),
				v2j(f.vertexNormals[1]),
				v2j(f.vertexNormals[2]),
				v2j(f.normal),
				*/
			];
		});
		json.uvs = geo.faceVertexUvs.map(function(uvLayer) {
			return uvLayer.map(function(uvs) {
				return [v2j(uvs[0]), v2j(uvs[1]), v2j(uvs[2])];
			});
		});
		return json;
	}

	function geometryFromJson(json) {
		var geo = new THREE.Geometry();
		geo.uuid = json.uuid;
		geo.type = json.type;
		json.faces
		.forEach(function(f) {
			if(f[0][2] === undefined) f[0][2] = 0;
			if(f[1][2] === undefined) f[1][2] = 0;
			if(f[2][2] === undefined) f[2][2] = 0;
			geo.vertices.push(new THREE.Vector3(f[0][0], f[0][1], f[0][2]));
			geo.vertices.push(new THREE.Vector3(f[1][0], f[1][1], f[1][2]));
			geo.vertices.push(new THREE.Vector3(f[2][0], f[2][1], f[2][2]));
			var vi = geo.vertices.length - 3;
			var face = new THREE.Face3(vi, vi+1, vi+2);
			face.materialIndex = f[3];
			/*
			face.vertexNormals = [
				new THREE.Vector3(f[3][0],f[3][1],f[3][2]),
				new THREE.Vector3(f[4][0],f[4][1],f[4][2]),
				new THREE.Vector3(f[5][0],f[5][1],f[5][2]),
			];
			face.normal = new THREE.Vector3(f[6][0],f[6][1],f[6][2]);
			*/
			geo.faces.push(face);
		});
		geo.faceVertexUvs = json.uvs.map(function(uvs) {
			return uvs.map(function(uv) {
				return [
					new THREE.Vector2(uv[0][0],uv[0][1]),
					new THREE.Vector2(uv[1][0],uv[1][1]),
					new THREE.Vector2(uv[2][0],uv[2][1]),
				];
			});
		});
		geo.verticesNeedUpdate = true;
		geo.elementsNeedUpdate = true;
		geo.uvsNeedUpdate = true;
		geo.normalsNeedUpdate = true;
		geo.colorsNeedUpdate = true;
		geo.groupsNeedUpdate = true;
		geo.computeBoundingBox();
		geo.computeFaceNormals();
		geo.computeVertexNormals();
		return geo;
	}

	function geometryToObj(geo) {
		console.log(geo.vertices.length);
		console.log(geo.faces.length);
		var objVertices = geo.vertices
			.map(function(v) { return 'v '+v.x+' '+v.y+' '+v.z+'\r\n'; })
			.join('');
		var objFaces = geo.faces
			.map(function(f) { return 'f '+(f.a+1)+' '+(f.b+1)+' '+(f.c+1)+'\r\n'; })
			.join('');
		return objVertices+objFaces;
		/*
		var faces = geo.faces;
		var verts = [];
		var vIndex = {};
		var i, vi, v, vKey;
		i = faces.length; while(i--) {
			for(vi = 0; vi < 3; vi++) {
				v = faces[i][vi];
				if(v[2] === undefined) v[2] = 0; // Fix exporter bug
				vKey = JSON.stringify(v);
				if(vIndex[vKey] === undefined) {
					verts.push(v);
					vIndex[vKey] = verts.length;
				}
			}
		}
		var objVerts = verts
			.map(function(v) {
				return 'v '+v[0]+' '+v[1]+' '+v[2]+'\r\n';
			})
			.join('');
		var objFaces = faces
			.map(function(f) {
				var a = JSON.stringify(f[0]);
				var b = JSON.stringify(f[1]);
				var c = JSON.stringify(f[2]);
				return 'f '+vIndex[a]+' '+vIndex[b]+' '+vIndex[c]+'\r\n';
			})
			.join('');
		return objVerts+objFaces;
		*/
	}

	function jsonToObj(json) {
		var faces = json.faces;
		var verts = [];
		var vIndex = {};
		var i, vi, v, vKey;
		i = faces.length; while(i--) {
			for(vi = 0; vi < 3; vi++) {
				v = faces[i][vi];
				if(v[2] === undefined) v[2] = 0; // Fix exporter bug
				vKey = JSON.stringify(v);
				if(vIndex[vKey] === undefined) {
					verts.push(v);
					vIndex[vKey] = verts.length;
				}
			}
		}
		var objVerts = verts
			.map(function(v) {
				return 'v '+v[0]+' '+v[1]+' '+v[2]+'\r\n';
			})
			.join('');
		var objFaces = faces
			.map(function(f) {
				var a = JSON.stringify(f[0]);
				var b = JSON.stringify(f[1]);
				var c = JSON.stringify(f[2]);
				return 'f '+vIndex[a]+' '+vIndex[b]+' '+vIndex[c]+'\r\n';
			})
			.join('');
		return objVerts+objFaces;
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
	module.exports.getSpacedPointsWithCorners = getSpacedPointsWithCorners;
	module.exports.extrudeProfileOnPath = extrudeProfileOnPath;
	module.exports.geometryToJson = geometryToJson;
	module.exports.geometryFromJson = geometryFromJson;
	module.exports.geometryToObj = geometryToObj;
	module.exports.jsonToObj = jsonToObj;
	module.exports.convexHull = convexHull;
}
})();