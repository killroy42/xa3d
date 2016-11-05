(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var THREEPrototype = require('THREEPrototype');
var initLights = require('initLights');


function makePhysBox() {
	var box = new THREE.Mesh(
		new THREE.CubeGeometry(10, 10, 10),
		new THREE.MeshPhongMaterial({color: 0xff0000})
	);
	box.velocity = new THREE.Vector3(0, 0, 0);
	box.acceleration = new THREE.Vector3(0, 0, 0);
	box.move = function(gravity) {
		this.velocity
			.add(gravity)
			.add(this.acceleration);
		this.position.add(this.velocity);
		if(this.position.z < 5) {
			this.position.z = 5;
			this.velocity.z = 0;
		}
	};
	return box;
}

// Init Prototype
	function Prototype_init() {
		var scene = this.scene;
		this.setCamera(new THREE.Vector3(0, -200, 100), new THREE.Vector3(0, 100, 10));
		initLights(this);

		var base = new THREE.Mesh(
			new THREE.PlaneGeometry(100, 100, 100),
			new THREE.MeshPhongMaterial({color: 0x00ff00})
		);
		scene.add(base);

		var g = 0.05;
		var gravObj = [];
		var power = 2 * g;
		var idle = 0.5 * g;
		var gravity = new THREE.Vector3(0, 0, -g);

		var craft = new THREE.Mesh(
			new THREE.CubeGeometry(40, 60, 3),
			new THREE.MeshPhongMaterial({color: 0x009000})
		);
		scene.add(craft);

		var box1 = makePhysBox();
		gravObj.push(box1);
		box1.position.set(-20, -30, 100);
		scene.add(box1);

		var box2 = makePhysBox();
		gravObj.push(box2);
		box2.position.set(20, -30, 100);
		scene.add(box2);

		var box3 = makePhysBox();
		gravObj.push(box3);
		box3.position.set(-20, 30, 100);
		scene.add(box3);

		var box4 = makePhysBox();
		gravObj.push(box4);
		box4.position.set(20, 30, 100);
		scene.add(box4);


		window.addEventListener('keydown', function(e) {
			switch(e.keyCode) {
				case 81: box3.acceleration.z = power; break; // Q
				case 87: box4.acceleration.z = power; break; // W
				case 65: box1.acceleration.z = power; break; // A
				case 83: box2.acceleration.z = power; break; // S
			}
		});
		window.addEventListener('keyup', function(e) {
			switch(e.keyCode) {
				case 81: box3.acceleration.z = idle; break; // Q
				case 87: box4.acceleration.z = idle; break; // W
				case 65: box1.acceleration.z = idle; break; // A
				case 83: box2.acceleration.z = idle; break; // S
			}
		});

		window.addEventListener('mousedown', function(e) {
			var left = (e.buttons & 1) !== 0;
			var right = (e.buttons & 2) !== 0;
			//console.log(e.buttons, left, right);
			if(left) box1.acceleration.z = 0.1;
			if(right) box2.acceleration.z = 0.1;
		});
		window.addEventListener('mouseup', function(e) {
			var left = (e.buttons & 1) !== 0;
			var right = (e.buttons & 2) !== 0;
			//console.log(e.buttons, left, right);
			if(!left) box1.acceleration.z = 0;
			if(!right) box2.acceleration.z = 0;
		});
		
		function animate() {
			window.requestAnimationFrame(animate);
			for(var i = 0, l = gravObj.length; i < l; i++) {
				gravObj[i].move(gravity);
			}
			var fl = gravObj[0];
			var fr = gravObj[1];
			var bl = gravObj[2];
			var br = gravObj[3];
			craft.position
				.copy(fl.position)
				.add(fr.position)
				.add(bl.position)
				.add(br.position)
				.multiplyScalar(0.25);


			var axis1 = new THREE.Vector3(0, 1, 0);
			var axis2 = new THREE.Vector3(1, 0, 0);
			var angle = Math.PI / 2;

			var v1 = new THREE.Vector3();
			v1.copy(fl.position);
			v1.sub(fr.position);
			v1.applyAxisAngle(axis1, angle);

			var v2 = new THREE.Vector3();
			v2.copy(bl.position);
			v2.sub(br.position);
			v2.applyAxisAngle(axis1, angle);

			var v3 = new THREE.Vector3();
			v3.copy(fl.position);
			v3.sub(bl.position);
			v3.applyAxisAngle(axis2, angle);

			var v4 = new THREE.Vector3();
			v4.copy(fr.position);
			v4.sub(br.position);
			v4.applyAxisAngle(axis2, angle);

			v1.add(v2).multiplyScalar(0.5);
			v3.add(v4).multiplyScalar(0.5);

			v1.sub(v3);
			/*
			var m = new THREE.Matrix4()
			.clone(craft.matrix)
			.lookAt(craft.position, fl.position, new THREE.Vector3(0, 1, 0));
			craft.applyMatrix(m);
			*/

			//v1.add(craft.position);
			//console.log(v1.toString());
			//craft.rotateOnAxis(v1, 0.5 * Math.PI);
			//var z = (fl.position.z + fr.position.z + bl.position.z + br.position.z) / 4;
			//console.log(z, craft.position.z);
			//v1.multiplyScalar(0.25);
			//.copy(craft.position)
			//v1.x = 0;
			//v1.y = 0;
			//console.log(v1.toString());
			craft.lookAt(v1);
			//craft.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0.5 * Math.PI);
		}
		window.requestAnimationFrame(animate);
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();