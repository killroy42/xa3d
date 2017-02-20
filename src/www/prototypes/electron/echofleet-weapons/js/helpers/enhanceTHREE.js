// enhanceTHREE
(function () {
	var enhanced = false;

	function Vector2_toString() {
		return 'V2{'+
			'x:'+this.x.toFixed(2)+','+
			'y:'+this.y.toFixed(2)+'}';
	}
	
	function Vector3_toString() {
		return 'V3{'+
			'x:'+this.x.toFixed(2)+','+
			'y:'+this.y.toFixed(2)+','+
			'z:'+this.z.toFixed(2)+'}';
	}

	function Euler_toString() {
		return 'Euler{'+
			'x:'+this.x.toFixed(1)+','+
			'y:'+this.y.toFixed(1)+','+
			'z:'+this.z.toFixed(1)+'}';
	}

	function Matrix4_toString() {
		return 'Matrix4{'+
			[...this.elements].map((el, idx) => ((idx % 4)?'':'\n')+el.toFixed(2)).join(', ')
			+'}';
	}

	function Face3_flip() {
		var b = this.b;
		this.b = this.c;
		this.c = b;
		this.normal.negate();
		this.vertexNormals = [
			this.vertexNormals[0],
			this.vertexNormals[2],
			this.vertexNormals[1],
		];
		if(this.vertexColors.length > 0) {
			this.vertexColors = [
				this.vertexColors[0],
				this.vertexColors[2],
				this.vertexColors[1],
			];
		}
	}

	function BufferGeometry_toGeometry() {
		var posAttr = this.getAttribute('position');
		var uvAttr = this.getAttribute('uv');
		var normalAttr = this.getAttribute('normal');
		var positions = posAttr.array;
		var vertices = [], faces = [];
		var i, n, a, b, c, u, v;
		if(posAttr === undefined) {
			throw new Error('a given BufferGeometry object must have a position attribute.');
		}
		var geometry = new THREE.Geometry();
		//console.log('toGeometry > positions:', posAttr.count);
		//if(uvAttr) console.log('toGeometry > uvs:', uvAttr.count);
		//if(normalAttr) console.log('toGeometry > normals:', normalAttr.count);
		// Process vertices
			for(i = 0, n = positions.length; i < n; i += 3) {
				var x = positions[i];
				var y = positions[i + 1];
				var z = positions[i + 2];
				vertices.push(new THREE.Vector3(x, y, z));
			}
			//console.log('toGeometry > vertices:', vertices.length);
			geometry.vertices = vertices;
		// Generate faces
			for(i = 0, n = vertices.length; i < n; i += 3) {
				faces.push(new THREE.Face3(i, i + 1, i + 2));
			}
			//console.log('toGeometry > faces:', faces.length);
			geometry.faces = faces;
		// Process UVs
			if(uvAttr !== undefined) {
				var uvs = uvAttr.array;
				var faceVertexUvs = [];
				var uvScale = 1;
				//for(i = 0, l = uvs.length; i < l; i += 3) {
				for(i = 0, l = faces.length; i < l; i++) {
					//var uv = new THREE.Vector2(uvs[i], uvs[i+1]);
					a = i * 3;
					b = a + 1;
					c = b + 1;
					faceVertexUvs.push([
						new THREE.Vector2(uvs[a * 2] * uvScale, uvs[a * 2 + 1] * uvScale),
						new THREE.Vector2(uvs[b * 2] * uvScale, uvs[b * 2 + 1] * uvScale),
						new THREE.Vector2(uvs[c * 2] * uvScale, uvs[c * 2 + 1] * uvScale),
					]);
					//console.log(faceVertexUvs[i].map(function(uv) { return uv.toString(); }));
				}
				//console.log('toGeometry > faceVertexUvs:', faceVertexUvs.length);
				geometry.faceVertexUvs = [faceVertexUvs];
			}
		// Process normals
			if(normalAttr !== undefined) {
				var normals = normalAttr.array;
				for(i = 0, l = faces.length; i < l; i ++) {
				//for(i = 0, l = 2; i < l; i ++) {
					a = i * 3;
					b = a + 1;
					c = b + 1;
					faces[i].vertexNormals = [
						new THREE.Vector3(normals[a * 3], normals[a * 3 + 1], normals[a * 3 + 2]),
						new THREE.Vector3(normals[b * 3], normals[b * 3 + 1], normals[b * 3 + 2]),
						new THREE.Vector3(normals[c * 3], normals[c * 3 + 1], normals[c * 3 + 2]),
					];
					
				}
			} else {
				geometry.computeFaceNormals();
			}
		//console.log('toGeometry > uv:', vertices.length / 3);
		return geometry;
	}

	function enhanceTHREE(THREE) {
		if(enhanced) {
			console.warn('THREE.js has already been enhanced');
			return;
		}
		enhanced = true;
		THREE.Vector2.prototype.toString = Vector2_toString;
		THREE.Vector3.prototype.toString = Vector3_toString;
		THREE.Euler.prototype.toString = Euler_toString;
		THREE.Matrix4.prototype.toString = Matrix4_toString;
		THREE.Face3.prototype.flip = Face3_flip;
		THREE.BufferGeometry.prototype.toGeometry = BufferGeometry_toGeometry;
		return THREE;
	}
	
	
	if(typeof module !== 'undefined' && ('exports' in module)){
		module.exports = enhanceTHREE;
	}
})();