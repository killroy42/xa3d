(function() {
const THREE = require('THREE');
const Hammer = require('Hammer');
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {Camera} = require('ecsTHREE');
const {Components, createRuntime} = require('bootstrap');
const {Vector3, Object3D} = THREE;


const runtimeJson = {
	Runtime: {},
	Cursor: {},
	CameraController: {},
	Environment: {},
	//OrbitCamComponent: {position: {x: 0, y: 10.6, z: 3.7}, target: {x: 0, y: 0, z: 0.7}},
	//TransformHandle: {},
	//FontLoaderComponent: {},
	//TextureLoaderComponent: {},
	//CSSFontLoaderComponent: {},
};

const calcAccel = (x, v, maxA, dt) => {
	if(dt === 0) return 0;
	const signX = (x < 0)?-1:1;
	const a = signX * (Math.sqrt(Math.abs(1 + (2 * x) / (maxA * dt * dt))) * maxA - (v * signX) / dt - maxA);
	return Math.min(maxA, Math.max(-maxA, a));
};

class CameraController {
	constructor() {
		//this.handleOnBeforeRender = this.handleOnBeforeRender.bind(this);
		this.isAnimating = false;
		this.positionV = 0;
		this.targetV = 0;
		this._t0;
		this._onAnimationComplete;
	}
	createOnBeforeRenderHandler() {
		console.info('CameraController.createOnBeforeRenderHandler();');
		const {
			target: currentTarget,
			_camera: camera,
			_camera: {position: currentPosition},
			nextPosition, nextTarget,
		} = this;
		const maxPA = 200, maxPV = 40;
		const maxTA = 250, maxTV = 45;
		const minDistance = 0.0000001;
		let t0, dt;
		const positionDelta = new Vector3(), targetDelta = new Vector3();
		const newPosition = new Vector3(), newTarget = new Vector3();
		return time => {
			if(t0 === undefined) { t0 = time; return; }
			if(this.isAnimating) {
				dt = (time - t0) / 1000;
				positionDelta.copy(nextPosition).sub(currentPosition);
				targetDelta.copy(nextTarget).sub(currentTarget);
				const positionDistance = positionDelta.length();
				const targetDistance = targetDelta.length();
				newPosition.copy(nextPosition);
				newTarget.copy(nextTarget);
				if((positionDistance + targetDistance) > minDistance) {
					const positionA = calcAccel(positionDistance, this.positionV, maxPA, dt);
					const targetA = calcAccel(targetDistance, this.targetV, maxTA, dt);
					this.positionV = Math.max(-maxPV, Math.min(maxPV, this.positionV + positionA * dt));
					this.targetV = Math.max(-maxTV, Math.min(maxTV, this.targetV + targetA * dt));
					newPosition.copy(currentPosition).add(positionDelta.multiplyScalar(this.positionV * dt / positionDistance));
					newTarget.copy(currentTarget).add(targetDelta.multiplyScalar(this.targetV * dt / targetDistance));
				} else {
					this.isAnimating = false;
					if(typeof this._onAnimationComplete === 'function') {
						const onCompleteHandler = this._onAnimationComplete;
						this._onAnimationComplete = undefined;
						onCompleteHandler();
					}
				}
				this.fromVectors({position: newPosition, target: newTarget});
			}
			t0 = time;
		};
	}
	OnAttachComponent(entity) {
		this._camera = entity.requireComponent('Camera');
		this._runtime = entity.requireComponent('Runtime');
		this.target = this._camera.position.clone().add(new Vector3(0, 0, 1));
		this.nextPosition = new Vector3();
		this.nextTarget = new Vector3();
		this._runtime.OnBeforeRender.push(this.createOnBeforeRenderHandler());
	}
	fromVectors({position: nextPosition, target: nextTarget}) {
		//console.info('CameraController.setCamera({position, target});');
		const {entity, target, _camera: camera} = this;
		//const vHoriz = new THREE.Vector3(0, 0, -1);
		//const camV = new Vector3().copy(target).sub(nextPosition);
		target.copy(nextTarget || target || new Vector3(0, 0, -1).add(nextPosition));
		camera.position.copy(nextPosition);
		camera.lookAt(target);
		camera.updateMatrix();
	}
	lookAtToVectors({target, axis, angle, distance}) {
		const position = new Vector3(0, 0, -1)
			.applyAxisAngle(axis, angle * Math.PI / 180)
			.multiplyScalar(distance)
			.add(target);
		return {position, target};
	}
	slideCamera({position, target, speed = 10, onComplete}) {
		//console.info('CameraController.slideCamera({position, target});');
		const {_runtime: runtime} = this;
		runtime.OnBeforeRender;
		this.nextPosition.copy(position);
		this.nextTarget.copy(target);
		this.isAnimating = true;
		//this.fromVectors({position, target});
		this._onAnimationComplete = onComplete;
	}
}

const init = () => {
	const entities = new EntityManager();
	entities.registerComponents(Components);
	entities.registerComponents([CameraController]);
	const runtime = entities.createEntity(runtimeJson).runtime;
	//runtime.camera.position.set(0, 5, 10);
	//console.log(runtime.camera);
	//setInterval(() => runtime.renderer.render(runtime.scene, runtime.camera), 16);
	
	const {floor} = entities.findComponent('Environment');
	const cam = runtime.entity.cameraController;
	const axis = new Vector3(1, 0, 0), angle = 50, distance = 10, zoomUnit = 0.5;
	cam._camera.position.set(0, distance, 0);
	let currentCam = cam.lookAtToVectors({target: new Vector3(0, 0, 0), axis, angle, distance});
	
	const minZoom = -9, maxZoom = 15;
	let zoom = 0;
	const moveCamWithZoom = (instant = false) => {
		zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
		if(instant) {
			cam.fromVectors({
				position: currentCam.position.clone().add(new Vector3(0, Math.sign(zoom), -0.5 * Math.sign(zoom)).multiplyScalar(Math.abs(zoom) * zoomUnit)),
				target: currentCam.target,
			});
		} else {
			cam.slideCamera({
				position: currentCam.position.clone().add(new Vector3(0, Math.sign(zoom), -0.5 * Math.sign(zoom)).multiplyScalar(Math.abs(zoom) * zoomUnit)),
				target: currentCam.target,
				//onComplete: ()=>console.log('onComplete'),
			});
		}
	};

	const handleMouseup = event => {
		if(event.button === 0) {
			currentCam = cam.lookAtToVectors({target: event.intersection.point, axis, angle, distance});
			moveCamWithZoom();
		}
	};
	const handleWheel = event => {
		zoom += Math.sign(event.deltaY);
		console.log('zoom:', zoom);
		moveCamWithZoom();
	};
	const handleKeydown = event => {
		const distance = 3;
		const deltaUp = new Vector3(0, 0, 1);
		const deltaDown = new Vector3(0, 0, -1);
		const deltaLeft = new Vector3(1, 0, 0);
		const deltaRight = new Vector3(-1, 0, 0);
		let delta = new Vector3();
		switch(event.code) {
			case 'KeyW': case 'ArrowUp': delta.copy(deltaUp); break;
			case 'KeyS': case 'ArrowDown': delta.copy(deltaDown); break;
			case 'KeyA': case 'ArrowLeft': delta.copy(deltaLeft); break;
			case 'KeyD': case 'ArrowRight': delta.copy(deltaRight); break;
			case 'NumpadAdd': zoom = Math.max(minZoom, Math.min(maxZoom, zoom + 1)); break;
			case 'NumpadSubtract': zoom = Math.max(minZoom, Math.min(maxZoom, zoom - 1)); break;
			case 'Digit0': if(event.ctrlKey) zoom = 0; break;
			default: console.log('Unhandled key code:', event.code); return;
		}
		console.log(zoom);
		delta.multiplyScalar(distance);
		currentCam.position.add(delta);
		currentCam.target.add(delta);
		moveCamWithZoom();
	};

	floor.addEventListener('mouseup', handleMouseup);
	window.addEventListener('wheel', handleWheel);
	window.addEventListener('keydown', handleKeydown);

	/*
	window.addEventListener('touchstart', event => console.info('win.touchstart', event));
	window.addEventListener('touchstart', event => console.info('doc.touchstart', event));
	window.addEventListener('touchend', event => console.info('touchend', event));
	window.addEventListener('touchmove', event => console.info('touchmove', event));
	window.addEventListener('gesturestart', event => console.info('gesturestart', event));
	window.addEventListener('gestureend', event => console.info('gestureend', event));
	window.addEventListener('gesturechange', event => console.info('gesturechange', event));
	*/

	const hammertime = new Hammer(window, {
		recognizers: [
			// RecognizerClass, [options], [recognizeWith, ...], [requireFailure, ...]
			//[Hammer.Rotate],
			[Hammer.Pan],
			//[Hammer.Pinch, { enable: true }, ['rotate']],
			//[Hammer.Pinch, {enable: true}],
			//[Hammer.Swipe, {enable: true, direction: Hammer.DIRECTION_VERTICAL}],
			//[Hammer.Press],
			//[Hammer.Tap],
		]
	});
	let startZoom = zoom;
	let startScale;
	hammertime.on('pinchstart', event => {
		console.log('pinchstart:', event.scale, zoom);
		startZoom = zoom;
		startScale = event.scale;
	});
	/*
	hammertime.on('pinchmove', event => {
		//console.log('pinchmove:', event);
		console.log('pinchmove:', event.additionalEvent, event.scale, event.distance, startZoom, zoom);
		zoom = startZoom + ((event.additionalEvent==='pinchout')?1:-1) * 3 *  event.distance;
		moveCamWithZoom();
	});
	*/
	hammertime.on('pinchin', event => {
		console.log('pinchin:', zoom, event.scale - startScale, 100 * Math.abs(event.scale - startScale), event.distance, startZoom, zoom);
		zoom = startZoom + 1 * 100 * Math.abs(event.scale - startScale);
		moveCamWithZoom();
	});
	hammertime.on('pinchout', event => {
		console.log('pinchout:', zoom, event.scale - startScale, 100 * Math.abs(event.scale - startScale), event.distance, startZoom, zoom);
		zoom = startZoom + -1 * 100 * Math.abs(event.scale - startScale);
		moveCamWithZoom();
	});
	hammertime.on('pinchend', event => {
		console.log('pinchend:', event.scale, zoom);
		//startZoom = zoom;
	});
	hammertime.on('pinchcancel', event => {
		console.log('pinchcancel:', event.scale, zoom);
		//startZoom = zoom;
	});

	hammertime.on('pan', event => console.log('pan:', event));
	hammertime.on('panstart', event => console.log('panstart:', event));
	hammertime.on('panmove', event => console.log('panmove:', event));
	hammertime.on('panend', event => console.log('panend:', event));
	hammertime.on('pancancel', event => console.log('pancancel:', event));
	hammertime.on('panup', event => console.log('panup:', event));
	//hammertime.on('pinch', event => console.log('pinch:', event));
	//hammertime.on('swipe', event => console.log('swipe:', event));
	//hammertime.on('swipeleft', event => console.log('swipeleft:', event));
	//hammertime.on('swiperight', event => console.log('swiperight:', event));
	//hammertime.on('swipeup', event => console.log('swipeup:', event));
	//hammertime.on('press', event => console.log('press:', event));
	//hammertime.on('tap', event => console.log('tap:', event));

	moveCamWithZoom(true);
	runtime.start();
	

	/*
	floor.addEventListener('drag', event => {
		//console.log('drag', event);
		const delta = event.start.clone().sub(cam.cameraTarget);
		const vO = cam.position;
		const v0 = event.start.clone().add(delta).sub(vO);
		const v1 = v0.clone().add(event.delta);
		v0.x = 0;
		v1.x = 0;
		const forward = new THREE.Vector3(0, 0, 1);
		const a0 = forward.angleTo(v0);
		const a1 = forward.angleTo(v1);
		console.log('== v0:', v0, a0 * 180 / Math.PI);
		console.log('   v1:', v1, a1 * 180 / Math.PI);
		const angle = a1 * 180 / Math.PI;
		cam.fromVectors(cam.lookAtToVectors({target: new Vector3(0, 0, 0), axis, angle, distance}));
	});
	*/

	/*
	let pos = new Vector3(0, 20, 20);
	const forward = new THREE.Vector3(0, 0, -1);
	const axis = new THREE.Vector3(1, 0, 0);
	const angle = 50, distance = 20;
	let target = new THREE.Vector3(0, 0, -1)
		.applyAxisAngle(axis, angle * Math.PI / 180)
		.add(pos);
	//let target = pos.clone().add(v0);
	let lookAt = new Vector3(0, 0, 0);
	let lookFrom = new Vector3(0, 0, -1)
		.multiplyScalar(distance)
		.applyAxisAngle(axis, (angle) * Math.PI / 180);
	pos = lookAt.clone().add(lookFrom);
	target = lookAt;

	console.log('lookAt:', lookAt);
	console.log('lookFrom:', lookFrom);
	console.log('pos:', pos);
	console.log('target:', target);
	//runtime.entity.cameraController.setCamera(pos, target);
	runtime.entity.cameraController.setLookAt(new Vector3(0, 0, 0), axis, angle, distance);
	//console.log(cam);
	//cam.position.copy(pos);
	//cam.lookAt(target);
	//cam.quaterion.setFromAxisAngle(vAxisX, -50 * Math.PI / 180);

	/*
		THREE.PerspectiveCamera.call(this, 
			50,
			window.innerWidth / window.innerHeight,
			0.1, 2000
		);
		this.position.set(0, 0, 100);
		this.up = new Vector3(0, 1, 0);
		this.lookAt(new Vector3(0, 0, 0));
	}

		const {entity, cameraTarget, camera} = this;
		target = target || cameraTarget || new Vector3(0, 0, 0);
		camera.position.copy(position);
		camera.lookAt(target);
		this._targetDistance = camera.position.clone().sub(target).length();
		camera.updateMatrix();
		camera.near = 0.1;
		this.position0.copy(position);
		this.target0.copy(target);
		this.reset();
		this.cameraTarget = target;
	*/
	
};

document.addEventListener('DOMContentLoaded', init);

})();