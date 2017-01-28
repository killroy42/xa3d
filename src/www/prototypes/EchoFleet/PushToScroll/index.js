(function() {
const THREE = require('THREE');
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {Vector3} = THREE;


const deltaUp = new Vector3(0, 0, 1);
const deltaDown = new Vector3(0, 0, -1);
const deltaLeft = new Vector3(1, 0, 0);
const deltaRight = new Vector3(-1, 0, 0);

const getComponentsFromModules = modules => modules
	.map(require)
	.map(m=>(typeof m === 'function')?[m]:Object.keys(m).map(key=>m[key]))
	.reduce((arr, components)=>arr.concat(components), [])
	.filter(C=>typeof C === 'function');

const createRuntime = () => {
	const entities = new EntityManager();
	entities.registerComponents(getComponentsFromModules(['ecsTHREE', 'Environment', 'CameraController']));
	return entities.createEntity(['Runtime', 'Cursor', 'CameraController', 'Environment']).runtime;
};

// Event Handlers
	const createKeydownHandler = camera => {
		const distance = 3;
		let delta = new Vector3();
		return event => {
			let zoom = camera.zoom;
			switch(event.code) {
				case 'KeyW': case 'ArrowUp': delta.copy(deltaUp); break;
				case 'KeyS': case 'ArrowDown': delta.copy(deltaDown); break;
				case 'KeyA': case 'ArrowLeft': delta.copy(deltaLeft); break;
				case 'KeyD': case 'ArrowRight': delta.copy(deltaRight); break;
				case 'NumpadAdd': zoom++; break;
				case 'NumpadSubtract': zoom--; break;
				case 'Digit0': if(event.ctrlKey) zoom = 0; break;
				default: console.log('Unhandled key code:', event.code); return;
			}
			delta.multiplyScalar(distance);
			camera.slideCamera(delta.add(camera.target), zoom);
		};
	};
	const createMouseupHandler = camera => event => {
		if(event.button === 0) {
			camera.slideCamera(event.intersection.point, camera.zoom);
		}
	};
	const createWheelHandler = camera => event => {
		camera.slideCamera(camera.nextTarget, camera.zoom + Math.sign(event.deltaY));
	};

const initCamera = entities => {
	const {floor} = entities.findComponent('Environment');
	const camera = entities.findComponent('CameraController');
	floor.addEventListener('mouseup', createMouseupHandler(camera));
	window.addEventListener('wheel', createWheelHandler(camera));
	window.addEventListener('keydown', createKeydownHandler(camera));
	camera.setCamera(new Vector3(0, 0, 0), 0);
};

const init = () => {
	const runtime = createRuntime();
	initCamera(runtime.entities);

	const cursor = runtime.entities.findComponent('Cursor');
	const mouseEvents = runtime.entities.findComponent('MouseEvents');
	const camera = runtime.entities.findComponent('CameraController');
	const canvas = runtime.entities.findComponent('Renderer').domElement;

	cursor.cursor.scale.set(0.1, 0.1, 0.1);

	const handleStartPointerLockChange = event => console.log('pointerlockchnage:', event);
	const handleStartPointerLockError = event => console.log('pointerlockerror:', event);
	const handleStartPointerLock = event => (document.pointerLockElement !== canvas)?canvas.requestPointerLock():null;
	document.addEventListener('pointerlockchange', handleStartPointerLockChange);
	document.addEventListener('pointerlockerror', handleStartPointerLockError);
	canvas.addEventListener('click', handleStartPointerLock);

	runtime.OnBeforeRender.push(time => {
		if(document.pointerLockElement === null) return;
		const gutter = Math.max(10, canvas.height * 0.05, canvas.width * 0.05);
		mouseEvents.mouseV2.x = Math.max(-2 * gutter, Math.min(canvas.width + 2 * gutter, mouseEvents.mouseV2.x));
		mouseEvents.mouseV2.y = Math.max(-2 * gutter, Math.min(canvas.height + 2 * gutter, mouseEvents.mouseV2.y));
		const {x, y} = mouseEvents.mouseV2;
		const left = x - gutter;
		const right = (canvas.width - x) - gutter;
		const top = y - gutter;
		const bottom = (canvas.height - y) - gutter;
		if((left < 0) || (right < 0) || (top < 0) || (bottom < 0)) {
			const newTarget = {x: 0.5 * canvas.width, y: 0.5 * canvas.height};
			if(left < 0) newTarget.x += left * 5;
			if(right < 0) newTarget.x -= right * 5;
			if(top < 0) newTarget.y += top * 5;
			if(bottom < 0) newTarget.y -= bottom * 5;
			const offsetIntersection = mouseEvents.getIntersection(newTarget);
			if(offsetIntersection.point) camera.slideCamera(offsetIntersection.point, camera.zoom);
		}
		if(camera.isAnimating) {
			const mouseIntersection = mouseEvents.getIntersection(mouseEvents.mouseV2);
			if(mouseIntersection.point) cursor.cursor.position.copy(mouseIntersection.point);
		}
	});

	runtime.start();
};

document.addEventListener('DOMContentLoaded', init);

})();