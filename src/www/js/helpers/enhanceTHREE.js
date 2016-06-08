// enhanceTHREE
(function () {
	var enhanced = false;

	function Vector2_toString() {
		return 'V2{'+
			'x:'+this.x.toFixed(1)+','+
			'y:'+this.y.toFixed(1)+'}';
	}
	
	function Vector3_toString() {
		return 'V3{'+
			'x:'+this.x.toFixed(1)+','+
			'y:'+this.y.toFixed(1)+','+
			'z:'+this.z.toFixed(1)+'}';
	}

	function Euler_toString() {
		return 'Euler{'+
			'x:'+this.x.toFixed(1)+','+
			'y:'+this.y.toFixed(1)+','+
			'z:'+this.z.toFixed(1)+'}';
	}


	function BufferGeometry_toGeometry() {
		var attrib = this.getAttribute('position');
		var positions = attrib.array;
		var vertices = [];
		var faces = [], i, n;
		if(attrib === undefined) {
			throw new Error('a given BufferGeometry object must have a position attribute.');
		}
		for(i = 0, n = positions.length; i < n; i += 3) {
			var x = positions[i];
			var y = positions[i + 1];
			var z = positions[i + 2];
			vertices.push(new THREE.Vector3(x, y, z));
		}
		for(i = 0, n = vertices.length; i < n; i += 3) {
			faces.push(new THREE.Face3(i, i + 1, i + 2));
		}
		var geometry = new THREE.Geometry();
		geometry.vertices = vertices;
		geometry.faces = faces;
		geometry.computeFaceNormals();
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
		THREE.Euler.prototype.toString = Euler_toString;
		THREE.BufferGeometry.prototype.toGeometry = BufferGeometry_toGeometry;
		return THREE;
	}
	
	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = enhanceTHREE;
	}
})();