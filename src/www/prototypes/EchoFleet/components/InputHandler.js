(() => {
const THREE = require('THREE');
const {Vector3} = THREE;


class InputHandler {
	constructor() {
	}
	OnAttachComponent(entity) {
		const entities = entity.entities;
		const {floor} = entities.findComponent('Environment');
		const camera = entities.findComponent('CameraController');
		const mouse = entities.findComponent('MouseEvents');
		const node = entity.requireComponent('Node');
		//const viewMarker = this.viewMarker = this.addMarker(matMarkerGreen);
		//const moveMarker = this.moveMarker = this.addMarker(matMarkerRed);
		
		const camBackup = {
			positionAccelerator: {maxA: 0, maxV: 0},
			targetAccelerator: {maxA: 0, maxV: 0},
		};
		const setCamSpeedFast = (camera) => {
			camBackup.positionAccelerator.maxA = camera.positionAccelerator.maxA;
			camBackup.positionAccelerator.maxV = camera.positionAccelerator.maxV;
			camBackup.targetAccelerator.maxA = camera.targetAccelerator.maxA;
			camBackup.targetAccelerator.maxV = camera.targetAccelerator.maxV;
			camera.positionAccelerator.maxA *= 1e6;
			camera.positionAccelerator.maxV *= 1e6;
			camera.targetAccelerator.maxA *= 1e6;
			camera.targetAccelerator.maxV *= 1e6;
			return camera;
		};
		const setCamSpeedNormal = (camera) => {
			camera.positionAccelerator.maxA = camBackup.positionAccelerator.maxA;
			camera.positionAccelerator.maxV = camBackup.positionAccelerator.maxV;
			camera.targetAccelerator.maxA = camBackup.targetAccelerator.maxA;
			camera.targetAccelerator.maxV = camBackup.targetAccelerator.maxV;
			return camera;
		};

		const {pointerVector, raycaster} = mouse;
		let isDragging = false;
		const dragStart = new Vector3();
		const dragEnd = new Vector3();
		let boundingRect;

		const raycast = (object, screenX, screenY) => {
			const normalizedX = -1 + 2 * ((screenX - boundingRect.left) / boundingRect.width);
			const normalizedY = 1 - 2 * ((screenY - boundingRect.top) / boundingRect.height);
			pointerVector.set(normalizedX, normalizedY);
			raycaster.setFromCamera(pointerVector, mouse.camera);
			const intersections = raycaster.intersectObject(floor, false);
			return intersections[0];
		};
		const createKeydownHandler = camera => {
			const distance = 3;
			const deltaUp = new Vector3(0, 0, 1).multiplyScalar(distance);
			const deltaDown = new Vector3(0, 0, -1).multiplyScalar(distance);
			const deltaLeft = new Vector3(1, 0, 0).multiplyScalar(distance);
			const deltaRight = new Vector3(-1, 0, 0).multiplyScalar(distance);
			const camTarget = new Vector3();
			return event => {
				let zoom = camera.zoom;
				camTarget.copy(camera.currentTarget);
				switch(event.code) {
					case 'KeyW': case 'ArrowUp': camTarget.add(deltaUp); break;
					case 'KeyS': case 'ArrowDown': camTarget.add(deltaDown); break;
					case 'KeyA': case 'ArrowLeft': camTarget.add(deltaLeft); break;
					case 'KeyD': case 'ArrowRight': camTarget.add(deltaRight); break;
					case 'NumpadAdd': zoom++; break;
					case 'NumpadSubtract': zoom--; break;
					case 'Digit0': if(event.ctrlKey) zoom = 0; break;
					default: console.log('Unhandled key code:', event.code); return;
				}
				camera.slideCamera(camTarget, zoom);
			};
		};
		const beginDragging = event => {
			if(isDragging) return;
			boundingRect = document.body.getBoundingClientRect();
			const intersection = raycast(floor, event.clientX, event.clientY);
			if(intersection === undefined) return;
			isDragging = true;
			dragStart.copy(intersection.point);
			setCamSpeedFast(camera);
			document.documentElement.style.cursor = 'none';
			window.addEventListener('mouseup', endDragging);
			window.addEventListener('mousemove', updateDragging);
		};
		const updateDragging = event => {
			if(!isDragging) return;
			const intersection = raycast(floor, event.clientX, event.clientY);
			if(intersection === undefined) return;
			dragEnd.copy(dragStart).add(camera.currentTarget).sub(intersection.point);
			camera.slideCamera(dragEnd, camera.zoom);
		};
		const endDragging = event => {
			if(!isDragging) return;
			isDragging = false;
			setCamSpeedNormal(camera);
			document.documentElement.style.cursor = 'auto';
			window.removeEventListener('mouseup', endDragging);
			window.removeEventListener('mousemove', updateDragging);
		};
		const handleFloorMousedown = event => {
			const target = event.intersection.point;
			const leftDown = event.buttons & 1;
			const rightDown = event.buttons & 2;
			if(leftDown) beginDragging(event);
			//if(rightDown) moveMarker.transform.position.copy(target);
		};
		const createWheelHandler = event => {
			camera.slideCamera(camera.nextTarget, camera.zoom + Math.sign(event.deltaY));
		};
		const handleKeydown = createKeydownHandler(camera);
		floor.addEventListener('mousedown', handleFloorMousedown);
		window.addEventListener('wheel', createWheelHandler);
		window.addEventListener('keydown', handleKeydown);
	}
	/*
	addMarker(color) {
		const node = this.entity.requireComponent('Node');
		node.attach(this.entities.createEntity(createMarkerJson(color)));
		return node.children[node.children.length - 1].entity;
	}
	*/
}

if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = InputHandler;
}
})();