(function() {
const THREE = require('THREE');
const enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
const THREEPrototype = require('THREEPrototype');
const MouseHandler = require('MouseHandler');
const MouseCursor = require('MouseCursor');
const {Entity, Component, System, EntityManager} = require('XenoECS');
const Transform = require('Transform');
const {Cards, cardMaker} = require('ecsCards');
const {Places, placeMaker} = require('ecsPlaces');
const {KeyHandler, GuiControl, Gui} = require('ecsGui');
const createBoard = require('createBoard');
const {
	colors, dimensions,
	boardTextureUrl, boardAlphaUrl,
} = require('assetdata');

const {
	Vector3,
	Matrix4,
	Euler,
	Object3D,
	Shape,
	Geometry,
	Mesh,
	GridHelper,
	PlaneGeometry,
	BoxGeometry,
	SphereGeometry,
	Color,
	Line,
	LineBasicMaterial,
	MeshBasicMaterial,
	MeshPhongMaterial,
	Raycaster,
	ArrowHelper,
	TransformControls,
} = THREE;

const gridSize = 100;
const SAVED_PLACES_KEY = 'savedPlaces';

// Init
	function initLights(prototype) {
		var scene = prototype.scene;
		scene.add(new THREE.AmbientLight(0x404040));
		var spotLight = new THREE.SpotLight(0xffffff, 0.8, 100, 45 * Math.PI/180, 1, 0.1);
		spotLight.position.set(6, 16, 3);
		spotLight.target.position.set(0, 0, 0);
		spotLight.castShadow = true;
		spotLight.shadow.bias = -0.000001;
		spotLight.shadow.camera.near = 1;
		spotLight.shadow.camera.far = 100;
		spotLight.shadow.camera.fov = 75;
		spotLight.shadow.mapSize.width = 1024;
		spotLight.shadow.mapSize.height = 1024;
		scene.add(spotLight);
	}
	function initSystems(app) {
		// EntityManager
			const entityManager = new EntityManager();
			app.entityManager = entityManager;
		// Cards
			const cards = entityManager.createSystem(Cards)
				.setMaker(cardMaker(app, {position: new Vector3()}));
		// Places
			const placeDefaults = {
				name: 'Place',
				display: 'hidden',
				position: new Vector3(),
				scale: new Vector3(1, 1, 1),
				rotation: new Euler(),
			};
			const places = entityManager.createSystem(Places)
				.setMaker(placeMaker(app, placeDefaults));
	}
	function initGUI(app) {
		const {entityManager} = app;
		const {places, cards} = entityManager;
		const guiEntity = entityManager.createEntity()
			.addComponent(Transform)
			.addComponent(KeyHandler)
			.addComponent(GuiControl)
			.addComponent(Gui);
		const {gui} = guiEntity;
		gui.init(app, places, cards);
		const fileMenu = {
			Load: () => {
				gui.select();
				places.loadPlacesFromJson(JSON.parse(localStorage.getItem(SAVED_PLACES_KEY)));
				gui.refresh();
			},
			Save: () => {
				if(confirm('Are you sure you want to save? (Overwrites previous save)')) {
					localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places.savePlacesToJson()));
				}
			},
			Clear: () => {
				gui.select();
				places.removeAllEntities();
				cards.removeAllEntities();
			},
			Undo: () => {
				gui.historyUndo();
			},
		};
		gui.addMenu('FILE', fileMenu);
		gui.addEventListener('propchange', (selected, prop, val) => {
			selected.placeView.arrangeCards();
		});
		fileMenu.Load();
	}
	function initEditor(app) {
		const {scene} = app;
		// Floor
			const floor = new Mesh(
				new PlaneGeometry(gridSize, gridSize, gridSize, gridSize),
				new MeshPhongMaterial({color: colors.grey900})
			);
			floor.name = 'floor';
			floor.rotateX(-90 * Math.PI / 180);
			floor.renderOrder  = -1;
			floor.receiveMouseEvents = true;
			scene.add(floor);
			const floorGrid = new GridHelper(gridSize / 2, gridSize, colors.grey700, colors.grey800);
			floorGrid.name = 'floorGrid';
			floorGrid.position.set(0, 0.001, 0);
			scene.add(floorGrid);
		// Screen
			const screenGeo = new Geometry();
			screenGeo.vertices.push(
				new Vector3(-0.5, 0, -0.5),
				new Vector3( 0.5, 0, -0.5),
				new Vector3( 0.5, 0,  0.5),
				new Vector3(-0.5, 0,  0.5),
				new Vector3(-0.5, 0, -0.5)
			);
			screenGeo.scale(dimensions.unitScale.screen.width, 1, dimensions.unitScale.screen.height);
			const screen = new Line(screenGeo, new LineBasicMaterial({color: colors.grey600}));
			screen.name = 'screen';
			screen.position.set(0, 0.001, 0);
			scene.add(screen);
		// Board
			
			const board = new Mesh(
				new BoxGeometry(dimensions.unitScale.board.width, dimensions.unitScale.board.height, 0.1),
				new MeshPhongMaterial({color: colors.grey600})
			);
			//board.name = 'board_collider';
			board.rotateX(-90 * Math.PI / 180);
			board.position.set(0, 0.5, 0);
			board.receiveMouseEvents = true;
			scene.add(board);
			
			
			const boardTex = app.loadTexture(boardTextureUrl);
			const boardAlpha = app.loadTexture(boardAlphaUrl);
			const board3d = createBoard(boardTex, boardAlpha);
			board3d.scale.set(0.01, 0.01, 0.01);
			board3d.rotation.set(-0.5 * Math.PI, 0, 0);
			board3d.position.set(0, 0.6, 0);
			scene.add(board3d);
			
	}
	function Prototype_init() {
		const app = this;
		const {scene, camera, renderer} = app;
		const mouseHandler = new MouseHandler({
			domElement: renderer.domElement, camera, scene
		});
		app.mouseHandler = mouseHandler;
		const pointer = new MouseCursor({scene}).attach(mouseHandler);
		pointer.cursor.scale.set(0.02, 0.02, 0.02);
		app.pointer = pointer;
		app.setCamera(new Vector3(0, 16, 3), new Vector3(0, 0, 0.4));
		initLights(app);
		initEditor(app);
		initSystems(app);
		initGUI(app);
	}
	function init() {
		var prototype = new THREEPrototype({fov: 50});
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();