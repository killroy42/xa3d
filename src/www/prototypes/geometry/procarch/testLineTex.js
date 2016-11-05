(function() {
const THREE = require('THREE');

function testLineTex(pt, texUrl) {
	const loadTexture = pt.getLoadTexture();
	const tex = loadTexture(texUrl);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	const scene = pt.scene;
	const geo = new THREE.Geometry();
	const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
	const width = 10;
	//const points = [v(-10, 10), v(-5, 12), v(5, 5), v(10, 8)];
	//const points = [v(-10, 5), v(0, 5), v(10, 5)];
	const points = [v(-10, 15), v(0, 15), v(0, 5)];
	const pointsPerSeg = 4;
	const vs = geo.vertices;
	const fs = geo.faces;
	var a, b, c, d;
	geo.faceVertexUvs = [];
	geo.faceVertexUvs[0] = [];
	var
		i,
		lenA = 0, totA = 0,
		lenB = 0, totB = 0;
	/*
		a--d
		|  |
		|  |
		b--c
	*/
	for(i = 0; i < points.length - 1; i++) {
		const p0 = points[i];
		const p1 = points[i+1];
		const n01 = p1.clone().sub(p0).normalize();
		const ii = i * pointsPerSeg;
		const o0 = v(n01.y, -n01.x).multiplyScalar(0.5 * width);
		if(i === 0) {
			a = geo.vertices.push(p0.clone().sub(o0)) - 1;
			b = geo.vertices.push(p0.clone().add(o0)) - 1;
		} else {
			a = d;
			b = c;
		}
		if(i >= points.length - 2) {
			c = geo.vertices.push(p1.clone().add(o0)) - 1;
			d = geo.vertices.push(p1.clone().sub(o0)) - 1;
		} else {
			const p2 = points[i+2];
			const n12 = p2.clone().sub(p1).normalize();
			const tan = n01.clone().add(n12).normalize();
			const miter = v(tan.y, -tan.x);
			const norm = v(n01.y, -n01.x);
			const o1 = miter.clone()
				.multiplyScalar(1 / miter.clone().dot(norm))
				.multiplyScalar(0.5 * width);
			c = geo.vertices.push(p1.clone().add(o1)) - 1;
			d = geo.vertices.push(p1.clone().sub(o1)) - 1;
		}
		const fa = geo.faces.push(new THREE.Face3(a, b, c)) - 1;
		const fb = geo.faces.push(new THREE.Face3(a, c, d)) - 1;
		totA += vs[d].clone().sub(vs[a]).length();
		totB += vs[c].clone().sub(vs[b]).length();
	}
	var ua0 = 0, ua1 = 0, ub0 = 0, ub1 = 0;
	lenA = 0;
	lenB = 0;
	for(i = 0; i < points.length - 1; i++) {
		const fa = i * 2;
		const fb = fa + 1;
		const [a, b, c, d] = [
			fs[fa].a,
			fs[fa].b,
			fs[fa].c,
			fs[fb].c,
		];
		lenA += vs[d].clone().sub(vs[a]).length();
		lenB += vs[c].clone().sub(vs[b]).length();
		ua1 = lenA / totA * 5;
		ub1 = lenB / totB * 5;
		geo.faceVertexUvs[0][fa] = [
			v(ua0, 1),
			v(ub0, 0),
			v(ub1, 0),
		];
		geo.faceVertexUvs[0][fb] = [
			v(ua0, 1),
			v(ub1, 0),
			v(ua1, 1),
		];
		ua0 = ua1;
		ub0 = ub1;
	}
	const mesh = new THREE.Mesh(
		geo,
		new THREE.MeshBasicMaterial({
			color: 0xffffff,
			map: tex
		})
	);
	scene.add(mesh);
	scene.add(new THREE.WireframeHelper(mesh, 0x00ff00));
}

module.exports = testLineTex;

})();