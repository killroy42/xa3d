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
		this.target = new Vector3();
		this.nextPosition = new Vector3();
		this.nextTarget = new Vector3();
		this._cameraTiltAxis = new Vector3(1, 0, 0);
		this._onAnimationComplete;
		this._positionOffset = new Vector3();
		this.updatePositionOffset();
		this._zoomOffset = new Vector3();
		this.updateZoomOffset();
	}
	createOnBeforeRenderHandler() {
		const {
			entities,
			target: currentTarget,
			_camera: camera,
			_camera: {position: currentPosition},
			nextPosition, nextTarget,
		} = this;
		const cursor = entities.findComponent('Cursor');
		const mouseEvents = entities.findComponent('MouseEvents');
		
		let t0, dt;
		const positionDelta = new Vector3(), targetDelta = new Vector3();
		const pAccelerator = new Accelerator(400 * 1.0, 40 * 1.0);
		const tAccelerator = new Accelerator(400 * 1.01, 40 * 1.01);
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
						currentPosition.add(positionDelta.multiplyScalar(pAccelerator.update(positionDistance, dt) / positionDistance));
					}
					if(targetDistance > 0) {
						currentTarget.add(targetDelta.multiplyScalar(tAccelerator.update(targetDistance, dt) / targetDistance));
					}
				} else {
					this.isAnimating = false;
					currentPosition.copy(nextPosition);
					currentTarget.copy(nextTarget);
					pAccelerator.reset();
					tAccelerator.reset();
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
		this.target.copy(this._camera.position).add(new Vector3(0, 0, 1));
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
		const {zoom, opts: {zoomUnit}} = this;
		return this._zoomOffset
			.set(0, Math.sign(zoom), -0.5 * Math.sign(zoom))
			.multiplyScalar(Math.abs(zoom) * zoomUnit);
	}
	setZoom(zoom = this.zoom) {
		const {opts: {minZoom, maxZoom, zoomUnit}} = this;
		this.zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
		this.updateZoomOffset();
		return this.zoom;
	}
	calcPosition(target) {
		return target.clone().add(this._zoomOffset).add(this._positionOffset);
	}
	slideCamera(target, zoom = this.zoom, onComplete) {
		const {_camera: camera} = this;
		this.setZoom(zoom);
		const position = this.calcPosition(target);
		this.nextPosition.copy(position);
		this.nextTarget.copy(target);
		this.isAnimating = true;
		this._onAnimationComplete = onComplete;
	}
	setCamera(target, zoom = this.zoom) {
		const {_camera: camera} = this;
		this.setZoom(zoom);
		const position = this.calcPosition(target);
		this.nextPosition.copy(position);
		this.nextTarget.copy(target);
		this.target.copy(target);
		camera.position.copy(position);
		camera.lookAt(this.target);
	}
}


if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = CameraController;
}
})();