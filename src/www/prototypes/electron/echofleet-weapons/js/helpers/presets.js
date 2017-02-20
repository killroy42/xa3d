(function() {
const {
	PlaneGeometry, MeshPhongMaterial, Mesh, GridHelper,
	AmbientLight, SpotLight
} = require('THREE');


function initFloor(app) {
	const {scene} = app;
	const gridSize = 100;
	const floor = new Mesh(new PlaneGeometry(gridSize, gridSize, gridSize, gridSize), new MeshPhongMaterial({color: 0x555555}));
	floor.name = 'floor';
	floor.rotateX(-90 * Math.PI / 180);
	floor.renderOrder  = -1;
	floor.receiveMouseEvents = true;
	scene.add(floor);
	const floorGrid = new GridHelper(gridSize / 2, gridSize);
	floorGrid.position.set(0, 0.001, 0);
	scene.add(floorGrid);
}

function initLights(app) {
	const {scene} = app;
	scene.add(new AmbientLight(0x404040));
	const spotLight = new SpotLight(0xffffff, 0.8, 1700, 45 * Math.PI/180, 1, 0.1);
	spotLight.position.set(200, 200, 1200);
	spotLight.target.position.set(100, 0, 0);
	spotLight.castShadow = true;
	spotLight.shadow.bias = -0.000001;
	spotLight.shadow.camera.near = 1;
	spotLight.shadow.camera.far = 2000;
	spotLight.shadow.camera.fov = 75;
	spotLight.shadow.mapSize.width = 1024;
	spotLight.shadow.mapSize.height = 1024;
	scene.add(spotLight);
}

function initMouseHandler(app) {
	const MouseHandler = require('MouseHandler');
	const MouseCursor = require('MouseCursor');
	const {scene, camera, renderer} = app;
	const mouseHandler = new MouseHandler({
		domElement: renderer.domElement, camera, scene
	});
	app.mouseHandler = mouseHandler;
	const pointer = new MouseCursor({scene}).attach(mouseHandler);
	pointer.cursor.scale.set(0.02, 0.02, 0.02);
	app.pointer = pointer;
}

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		initLights,
		initFloor,
		initMouseHandler,
	};
	module.exports.presets = module.exports;
}
})();