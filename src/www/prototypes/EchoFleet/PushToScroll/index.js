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
	entities.registerComponents(getComponentsFromModules(['ecsTHREE', 'Environment', 'CameraController', 'PushToScroller']));
	return entities.createEntity(['Runtime', 'Cursor', 'CameraController', 'Environment', 'PushToScroller']).runtime;
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

const setup = entities => {
	const cursor = entities.findComponent('Cursor');
	cursor.cursor.scale.set(0.1, 0.1, 0.1);
};

const init = () => {
	const runtime = createRuntime();
	initCamera(runtime.entities);
	initPushToScroll(runtime.entities);
	setup();
	runtime.start();
};

document.addEventListener('DOMContentLoaded', init);

})();