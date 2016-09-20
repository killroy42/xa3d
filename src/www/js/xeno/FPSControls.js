(function() {
const THREE = require('THREE');

// Constants
	const KEY = {
		FORWARD: 'FORWARD',
		BACKWARD: 'BACKWARD',
		LEFT: 'LEFT',
		RIGHT: 'RIGHT',
		UP: 'UP',
		DOWN: 'DOWN',
		SPRINT: 'SPRINT',
	};
	const DEFAULT_KEYMAPPINGS = {
		38: KEY.FORWARD, // up-arrow
		87: KEY.FORWARD, // w
		40: KEY.BACKWARD, // down-arrow
		83: KEY.BACKWARD, // s
		37: KEY.LEFT, // left-arrow
		65: KEY.LEFT, // a
		39: KEY.RIGHT, // right-arrow
		68: KEY.RIGHT, // d
		69: KEY.UP, // e
		32: KEY.UP, // space
		67: KEY.DOWN, // e
		17: KEY.DOWN, // ctrl
		16: KEY.SPRINT, // shift
	};

class FPSControls {
	constructor() {
		this.enabled = false;
		this.pitchObject = new THREE.Object3D();
		this.yawObject = new THREE.Object3D();
		this.yawObject.add(this.pitchObject);
		this.keyMappings = DEFAULT_KEYMAPPINGS;
		this.keys = {};
		this.prevTime = performance.now();
		this.direction = new THREE.Vector3();
		this.acceleration = new THREE.Vector3(100, 100, 100);
		this.inertia = new THREE.Vector3(20, 20, 20);
		this.velocity = new THREE.Vector3();
		this.velocityDelta = new THREE.Vector3();
		this.sprintSpeed = 3;
	}
	attachToDom(parent) {
		const PI_2 = Math.PI / 2;
		const pitchObject = this.pitchObject;
		const yawObject = this.yawObject;
		const scene = this.scene;
		const camera = this.camera;
		const keyMappings = this.keyMappings;
		const keys = this.keys;
		const element = document.createElement('div');
		const keyDownHandler = ({keyCode}) => keys[keyMappings[keyCode]] = true;
		const keyUpHandler = ({keyCode}) => keys[keyMappings[keyCode]] = false;
		const mouseMoveHandler = ({movementX, movementY}) => {
			yawObject.rotation.y -= movementX * 0.002;
			pitchObject.rotation.x -= movementY * 0.002;
			pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
		};
		var vertRefYaw, horizRefYaw;
		const deviceOrientationHandler = ({alpha, beta, gamma}) => {
			var pitch, yaw;
			const isVertical = window.innerHeight > window.innerWidth;
			if(isVertical) {
				pitch = beta - 90;
				yaw = alpha;
				if(horizRefYaw === undefined) horizRefYaw = yaw;
				yaw -= horizRefYaw;
			} else {
				pitch = -gamma;
				yaw = alpha;
				if(pitch < 0) {
					pitch = (180 + pitch);
					yaw -= 180;
				}
				pitch -= 90;
				if(vertRefYaw === undefined) vertRefYaw = yaw;
				yaw -= vertRefYaw;
			}
			pitchObject.rotation.x = pitch * Math.PI / 180;
			//yawObject.rotation.y = yaw * Math.PI / 180;
		};
		var yaw = 0;
		const deviceMotionHandler = ({rotationRate, interval}) => {
			const {alpha, beta, gamma} = rotationRate;
			var yawDelta;
			const isVertical = window.innerHeight > window.innerWidth;
			if(isVertical) {
				yawDelta = beta;
			} else {
				yawDelta = alpha;
			}
			yaw += yawDelta;
			//pitchObject.rotation.x = pitch * Math.PI / 180;
			yawObject.rotation.y = yaw * Math.PI / 180;
		};
		const enterPointerLock = () => {
			document.removeEventListener('pointerlockchange', enterPointerLock, false);
			document.addEventListener('pointerlockchange', leavePointerLock, false);
			document.addEventListener('mousemove', mouseMoveHandler, false);
			document.addEventListener('keydown', keyDownHandler, false);
			document.addEventListener('keyup', keyUpHandler, false);
			//window.addEventListener('deviceorientation', deviceOrientationHandler, true);
			//window.addEventListener('devicemotion', deviceMotionHandler, true);

			yawObject.position.copy(camera.position);
			yawObject.rotation.y = camera.rotation.y;
			pitchObject.rotation.x = camera.rotation.x;
			camera.rotation.set(0, 0, 0);
			camera.position.set(0, 0, 0);
			scene.add(yawObject);
			pitchObject.add(camera);

			element.style.display = 'none';
			this.enabled = true;
		};
		const leavePointerLock = () => {
			element.addEventListener('click', clickHandler);
			document.removeEventListener('pointerlockchange', leavePointerLock, false);
			document.removeEventListener('mousemove', mouseMoveHandler, false);
			document.removeEventListener('keydown', keyDownHandler, false);
			document.removeEventListener('keyup', keyUpHandler, false);

			camera.position.copy(yawObject.position);
			camera.rotation.x = pitchObject.rotation.x;
			camera.rotation.y = yawObject.rotation.y;
			scene.remove(yawObject);
			pitchObject.remove(camera);

			//window.removeEventListener('deviceorientation', deviceOrientationHandler, true);
			//window.removeEventListener('devicemotion', deviceMotionHandler, true);
			element.style.display = '';
			this.enabled = false;
		};
		const pointerLockError = (event) => {
			console.error('pointerlockerror:', event);
		};
		const clickHandler = (event) => {
			element.requestPointerLock();
			element.removeEventListener('click', clickHandler);
			document.addEventListener('pointerlockchange', enterPointerLock, false);
			document.addEventListener('pointerlockerror', pointerLockError, false);
		};
		element.innerHTML = 'FPS';
		element.style.cssText = `
			position: absolute;
			width: 3em; height: 2em;
			margin: 0.2em;
			font: bold 2em Arial;
			line-height: 2em;
			text-align: center;
			left: 0; top: 0;
			border: 2px solid white;
			border-radius: 0.2em;
			color: white;
			background: rgba(0,0,0,1);
			opacity: 0.3;
			cursor: pointer;
		`;
		element.addEventListener('click', clickHandler);
		element.addEventListener('mouseenter', () => element.style.opacity = 1);
		element.addEventListener('mouseleave', () => element.style.opacity = 0.3);
		parent.appendChild(element);
	}
	attach(camera, scene, domElement) {
		this.camera = camera;
		this.scene = scene;
		//this.attachToCamera(camera);
		//this.attachToScene(scene);
		this.attachToDom(domElement);
	}
	update(time) {
		if(this.enabled) {
			const keys = this.keys;
			const direction = this.direction;
			const acceleration = this.acceleration;
			const inertia = this.inertia;
			const velocity = this.velocity;
			const velocityDelta = this.velocityDelta;
			const pitchObject = this.pitchObject;
			const yawObject = this.yawObject;
			const sprintSpeed = this.sprintSpeed;
			const delta = (time - this.prevTime) / 1000;
			// Dampening
				velocity.x -= velocity.x * inertia.x * delta;
				velocity.y -= velocity.y * inertia.y * delta;
				velocity.z -= velocity.z * inertia.z * delta;
			// Accelaration
				var pitch = pitchObject.rotation.x;
				velocityDelta.set(0, 0, 0);
				var sprintMultiplier = keys[KEY.SPRINT]?sprintSpeed:1;
				if(keys[KEY.FORWARD]) {
					velocityDelta.z -= Math.cos(pitch) * acceleration.z * sprintMultiplier;
					velocityDelta.y += Math.sin(pitch) * acceleration.y * sprintMultiplier;
				}
				if(keys[KEY.BACKWARD]) {
					velocityDelta.z += Math.cos(pitch) * acceleration.z * sprintMultiplier;
					velocityDelta.y -= Math.sin(pitch) * acceleration.y * sprintMultiplier;
				}
				if(keys[KEY.LEFT]) velocityDelta.x -= acceleration.x * sprintMultiplier;
				if(keys[KEY.RIGHT]) velocityDelta.x += acceleration.x * sprintMultiplier;
				if(keys[KEY.UP]) velocityDelta.y += acceleration.y * sprintMultiplier;
				if(keys[KEY.DOWN]) velocityDelta.y -= acceleration.y * sprintMultiplier;
			velocity.add(velocityDelta.multiplyScalar(delta));
			yawObject.translateX(velocity.x * delta);
			yawObject.translateY(velocity.y * delta);
			yawObject.translateZ(velocity.z * delta);
		}
		this.prevTime = time;
	}
}

module.exports = {
	FPSControls: FPSControls,
};

})();