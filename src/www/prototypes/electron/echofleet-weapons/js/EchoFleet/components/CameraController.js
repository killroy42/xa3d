(() => {
const THREE = require('THREE');
const {Vector3} = THREE;
const Accelerator = require('Accelerator');


const CameraController_DEFAULTOPTS = {
	angle: 50,
	distance: 10,
	zoomUnit: 0.5,
	minZoom: -9,
	//maxZoom: 15,
	maxZoom: 100,
};

class CameraController {
	constructor(opts = CameraController_DEFAULTOPTS) {
		this.opts = opts;
		this.isAnimating = false;
		this.zoom = 0;
		this.currentTarget = new Vector3();
		this.nextPosition = new Vector3();
		this.nextTarget = new Vector3();
		this._cameraTiltAxis = new Vector3(1, 0, 0);
		this._onAnimationComplete;
		this._positionOffset = new Vector3();
		this._zoomOffset = new Vector3();
		this._zoomVector = new Vector3(0, 1, -0.5);
		this.updatePositionOffset();
		this.updateZoomOffset();
	}
	createOnBeforeRenderHandler() {
		const {
			entities,
			currentTarget,
			_camera: camera,
			_camera: {position: currentPosition},
			nextPosition, nextTarget,
		} = this;
		const cursor = entities.findComponent('Cursor');
		const mouseEvents = entities.findComponent('MouseEvents');
		
		let t0, dt;
		const positionDelta = new Vector3(), targetDelta = new Vector3();
		const positionAccelerator = new Accelerator(400 * 1.0, 40 * 1.0);
		const targetAccelerator = new Accelerator(400 * 1.01, 40 * 1.01);
		return time => {
			if(t0 === undefined) { t0 = time; return; }
			if(this.isAnimating) {
				dt = (time - t0) / 1000;
				positionDelta.subVectors(nextPosition, currentPosition);
				targetDelta.subVectors(nextTarget, currentTarget);
				const positionDistance = positionDelta.length();
				const targetDistance = targetDelta.length();
				if(positionDistance + targetDistance > Number.EPSILON) {
					if(positionDistance > 0) {
						currentPosition.add(positionDelta.multiplyScalar(positionAccelerator.update(positionDistance, dt) / positionDistance));
					}
					if(targetDistance > 0) {
						currentTarget.add(targetDelta.multiplyScalar(targetAccelerator.update(targetDistance, dt) / targetDistance));
					}
				} else {
					this.isAnimating = false;
					currentPosition.copy(nextPosition);
					currentTarget.copy(nextTarget);
					positionAccelerator.reset();
					targetAccelerator.reset();
					if(typeof this._onAnimationComplete === 'function') {
						const onCompleteHandler = this._onAnimationComplete;
						this._onAnimationComplete = undefined;
						onCompleteHandler();
					}
				}
				camera.lookAt(currentTarget);
				// Update mouse cursor
					const mouseIntersection = mouseEvents.getIntersection(mouseEvents.mouseV2);
					if(mouseIntersection.point) cursor.cursor.position.copy(mouseIntersection.point);
			}
			t0 = time;
		};
	}
	OnAttachComponent(entity) {
		this._camera = entity.requireComponent('Camera');
		this._runtime = entity.requireComponent('Runtime');
		this.currentTarget.copy(this._camera.position).add(new Vector3(0, 0, 1));
		this._onBeforeRenderHandler = this.createOnBeforeRenderHandler();
		this._runtime.OnBeforeRender.push(this._onBeforeRenderHandler);
		this.setCamera(new Vector3(0, 0, 0), 0);
	}
	updatePositionOffset() {
		const {_cameraTiltAxis, opts: {angle, distance}} = this;
		return this._positionOffset
			.set(0, 0, -1)
			.applyAxisAngle(_cameraTiltAxis, angle * Math.PI / 180)
			.multiplyScalar(distance);
	}
	updateZoomOffset() {
		const {zoom, opts: {zoomUnit}, _zoomVector} = this;
		return this._zoomOffset
			.copy(_zoomVector)
			.multiplyScalar(zoom * zoomUnit);
	}
	setZoom(nextZoom = this.zoom) {
		const {opts: {minZoom, maxZoom, zoomUnit}} = this;
		this.zoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));
		this.updateZoomOffset();
		return this.zoom;
	}
	calcPosition(target) {
		return target.clone().add(this._zoomOffset).add(this._positionOffset);
	}
	slideCamera(nextTarget, nextZoom = this.zoom, onComplete) {
		this.setZoom(nextZoom);
		const position = this.calcPosition(nextTarget);
		this.nextPosition.copy(position);
		this.nextTarget.copy(nextTarget);
		this.isAnimating = true;
		this._onAnimationComplete = onComplete;
	}
	setCamera(nextTarget, nextZoom = this.zoom) {
		this.slideCamera(nextTarget, nextZoom);
		this.isAnimating = false;
		const {_camera: camera} = this;
		camera.position.copy(this.nextPosition);
		this.currentTarget.copy(this.nextTarget);
		camera.lookAt(this.currentTarget);
	}
}


if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = CameraController;
}
})();