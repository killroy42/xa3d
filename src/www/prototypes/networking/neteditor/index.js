 (function() {
const THREE = require('THREE');
const enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
const THREEPrototype = require('THREEPrototype');
const {initLights, initFloor, initMouseHandler} = require('presets');
const {
	Vector3, Object3D,
	Mesh, CubeGeometry, MeshPhongMaterial,
	PlaneGeometry, 
} = require('THREE');
const ControlsSwitcher = require('ControlsSwitcher');
const FPSControls = require('FPSControls');
// ECS
	const {Entity, Component, System, EntityManager} = require('XenoECS');
	const {Transform, SceneComponent, Collider, ControlView, App} = require('components');
	const {Selectable} = require('ecsSelectable');
	const {KeyHandler, GuiControl, ControlHandle} = require('ecsGuiCore');
	const {NetClient, NetUser} = require('ecsNetworking');
const NetObjectBlueprint = require('NetObjectBlueprint');

const CONN_OPTS = {port: 82};

class NetObject extends Component {

}

// Init
	function initNetwork(app) {
		const {entityManager} = app;
		const entity = entityManager.createEntity([NetClient, NetUser]);
		const {netClient} = entity;
		netClient.connect(CONN_OPTS);
		//entity.addEventListener('connected', () => console.log('on(connected)'));
		//entity.addEventListener('clientready', () => console.log('on(clientready)'));
	}
	function initECS(app) {
		app.entityManager = new EntityManager();
		const {scene, entityManager} = app;
		const environment = entityManager.createEntity([Transform, App, KeyHandler, GuiControl]);
		environment.app.set(app);
		environment.transform.addTo(scene);
	}
	function initFpsControls(app) {
		const {camera, scene} = app;
		const fpsControls = new FPSControls();
		fpsControls.attach(camera, scene, document.body);
		app.fpsControls = fpsControls;
		app.addRenderHandler((time) => fpsControls.update(time));
	}
	function Prototype_init() {
		const app = this;
		const {camera, scene} = app;
		app.setCamera(new Vector3(1, 3, 6), new Vector3(0, 1, 0));
		initMouseHandler(app);
		app.controlsSwitcher = new ControlsSwitcher(app.controls).attach(app.mouseHandler);
		initLights(app);
		initFloor(app);
		initFpsControls(app);
		initECS(app);
		initNetwork(app);
	}
	function init() {
		var prototype = new THREEPrototype({fov: 70});
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();