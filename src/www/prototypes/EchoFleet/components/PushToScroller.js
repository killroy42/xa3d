(() => {
const THREE = require('THREE');
const {Vector2} = THREE;

class PushToScroller {
	constructor() {
		this._pushOnlyOnPointerLock = true;
	}
	OnAttachComponent(entity) {
		const entities = entity.entities;
		const runtime = entities.findComponent('Runtime');
		const canvas = entities.findComponent('Renderer').domElement;
		const handleStartPointerLock = event => (document.pointerLockElement !== canvas)?canvas.requestPointerLock():null;
		canvas.addEventListener('click', handleStartPointerLock);
		//this._pushOnlyOnPointerLock = false;
		runtime.OnBeforeRender.push(this.createOnBeforeRenderHandler());
	}
	createOnBeforeRenderHandler() {
		const entities = this.entities;
		const canvas = entities.findComponent('Renderer').domElement;
		const mouseEvents = entities.findComponent('MouseEvents');
		const camera = entities.findComponent('CameraController');
		const gutterClamp = (posV, dimsV, gutterV) => {
			posV.x = Math.max(-2 * gutterV.x, Math.min(dimsV.x + 2 * gutterV.x, posV.x));
			posV.y = Math.max(-2 * gutterV.y, Math.min(dimsV.y + 2 * gutterV.y, posV.y));
			return posV;
		};
		const getEdgePush = (mouseV, dimsV, gutterV, pushV = new Vector2()) => {
			const left = Math.min(0, mouseV.x - gutterV.x);
			const right = Math.min(0, (dimsV.x - mouseV.x) - gutterV.x);
			const top = Math.min(0, mouseV.y - gutterV.y);
			const bottom = Math.min(0, (dimsV.y - mouseV.y) - gutterV.y);
			return pushV.set(left - right, top - bottom);
		};
		const dimsV = new Vector2(canvas.width, canvas.height);
		const centerV = new Vector2(0.5 * dimsV.x, 0.5 * dimsV.y);
		const gutterV = new Vector2(Math.max(10, dimsV.x * 0.05), Math.max(10, dimsV.y * 0.05));
		const pushV = new Vector2();
		const pushScale = 2;
		const onBeforeRenderHandler = time => {
			// These should only update on window resize
				dimsV.set(canvas.width, canvas.height);
				centerV.set(0.5 * dimsV.x, 0.5 * dimsV.y);
				gutterV.set(Math.max(10, dimsV.x * 0.05), Math.max(10, dimsV.y * 0.05));
			if(this._pushOnlyOnPointerLock && (document.pointerLockElement === null)) return;
			if(document.pointerLockElement !== null) gutterClamp(mouseEvents.mouseV2, dimsV, gutterV);
			getEdgePush(mouseEvents.mouseV2, dimsV, gutterV, pushV);
			if(pushV.lengthSq() > 0) {
				const offsetIntersection = mouseEvents.getIntersection(pushV.multiplyScalar(pushScale).add(centerV));
				if(offsetIntersection.point) camera.slideCamera(offsetIntersection.point, camera.zoom);
			}
		};
		return onBeforeRenderHandler;
	}
}

if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = PushToScroller;
}
})();