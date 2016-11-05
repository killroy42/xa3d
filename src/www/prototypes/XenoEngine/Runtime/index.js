(function() {
const THREE = require('THREE');
const {makeRoundedRectShape} = require('GeometryHelpers');
const {
	colors, dimensions,
} = require('assetdata');
const {
	Vector3, Euler,
	OrbitControls,
	AmbientLight, SpotLight,
	Object3D,
	Mesh,
	Geometry,
	PlaneGeometry,
	MeshPhongMaterial,
	GridHelper,
	Line,
	LineBasicMaterial,
	ExtrudeGeometry,
} = THREE;

const {Entity, System, EntityManager, createComponent} = require('XenoECS');
const {
	Transform,
	Scene,
	Renderer,
	Camera,
	Runtime,
	MouseEvents,
	Cursor,
} = require('ecsTHREE');

class CamControl {
	constructor({camera, renderer}) {
		this.camera = camera;
		this.controls = new OrbitControls(camera, renderer.domElement);
		this.controls.userPanSpeed = 0.1;
		this.setCamera(camera.position);
	}
	setCamera(position, target) {
		const {controls, camera, cameraTarget} = this;
		target = target || cameraTarget || new Vector3(0, 0, 0);
		camera.position.copy(position);
		camera.lookAt(target);
		camera.updateMatrix();
		camera.near = 0.1;
		controls.position0.copy(position);
		controls.target0.copy(target);
		controls.reset();
		/*
		var controls = this.controls;
		if(controls === undefined) return;
		if(controls.position0) controls.position0.copy(camera.position);
		if(controls.target0) controls.target0.copy(cameraTarget);
		if(controls.reset) controls.reset();
		*/
		this.cameraTarget = target;
	}
}

const getRandomColor = (color) => {
	if(typeof color === 'number') return color;
	if(typeof color === 'string') return parseInt('0x'+color.replace(/^#/, ''));
	var keys = Object.keys(colors);
	return getRandomColor(colors[keys[Math.floor(Math.random() * keys.length)]]);
};


class CardData {
	constructor() {
		Object.defineProperties(this, {
			id: {get: () => this.entity.id, enumerable: true},
			name: {value: 'Card', writable: true, enumerable: true},
			color: {value: getRandomColor(), writable: true, enumerable: true},
		});
	}
	OnAttachComponent(entity) {
		this.name = `Card [${this.id}]`;
	}
	toString() {
		const {id, name, color} = this;
		return `Card[id: ${id}; name: "${name}"; color: ${color.toString(16)}]`;
	}
}

const CardMesh_DEFAULT_OPTS = {
	width: dimensions.unitScale.card.width,
	height: dimensions.unitScale.card.height,
	color: colors.BlueGrey700,
	corner: 0.2,
	thickness: 0.05
};
const CardMesh = createComponent('CardMesh', THREE.Mesh, {
	OnAttachComponent: function(entity) {
		const {entities} = this;
		const cardData = entity.requireComponent(CardData);
		this.createMesh({color: cardData.color});
		const transform = entity.requireComponent(Transform);
		transform.add(this);
	},
	createMesh: function(opts) {
		const {width, height, color, corner, thickness} = Object.assign([], CardMesh_DEFAULT_OPTS, opts);
		const shape = makeRoundedRectShape(0, 0, width, height, corner);
		const geometry = new ExtrudeGeometry(shape, {amount: thickness, bevelEnabled: false, steps: 1});
		geometry.rotateX(0.5 * Math.PI);
		geometry.translate(0, thickness, 0);
		geometry.computeBoundingBox();
		const material = new MeshPhongMaterial({color});
		Mesh.call(this, geometry, material);
		this.name = 'cardMesh';
	},
});

class Environment {
	OnAttachComponent(entity) {
		const transform = entity.requireComponent(Transform);
		transform.add(this.floor = this.createFloor());
		transform.add(this.floorGrid = this.createFloorGrid());
		transform.add(this.screenOutline = this.createScreenOutline());
		this.createLights();
	}
	createFloor({size = 100, color = colors.grey900} = {}) {
		const geometry = new PlaneGeometry(size, size, size, size);
		const material = new MeshPhongMaterial({color});
		const floor = new Mesh(geometry, material);
		floor.name = 'floor';
		floor.rotateX(-90 * Math.PI / 180);
		floor.renderOrder  = -1;
		console.log('floor.receiveMouseEvents = true;');
		floor.receiveMouseEvents = true;
		return floor;
	}
	createFloorGrid({size = 100, colorCenterLine = colors.grey700, colorGrid = colors.grey800} = {}) {
		const floorGrid = new GridHelper(size / 2, size, colorCenterLine, colorGrid);
		floorGrid.name = 'floorGrid';
		floorGrid.position.set(0, 0.001, 0);
		return floorGrid;
	}
	createScreenOutline({
		width = dimensions.unitScale.screen.width,
		height = dimensions.unitScale.screen.height,
		color = colors.grey600} = {}) {
		const geometry = new Geometry();
		geometry.vertices.push(
			new Vector3(-0.5, 0, -0.5),
			new Vector3( 0.5, 0, -0.5),
			new Vector3( 0.5, 0,  0.5),
			new Vector3(-0.5, 0,  0.5),
			new Vector3(-0.5, 0, -0.5)
		);
		geometry.scale(width, 1, height);
		const material = new LineBasicMaterial({color});
		const screenOutline = new Line(geometry, material);
		screenOutline.name = 'screen';
		screenOutline.position.set(0, 0.001, 0);
		return screenOutline;
	}
	createLights() {
		const {entity} = this;
		const transform = entity.requireComponent(Transform);
		const ambientLight = new AmbientLight(0x404040);
		const spotLight = new SpotLight(0xffffff, 0.8, 100, 45 * Math.PI/180, 1, 0.1);
		spotLight.position.set(6, 16, 3);
		spotLight.target.position.set(0, 0, 0);
		spotLight.castShadow = true;
		spotLight.shadow.bias = -0.000001;
		spotLight.shadow.camera.near = 1;
		spotLight.shadow.camera.far = 100;
		spotLight.shadow.camera.fov = 75;
		spotLight.shadow.mapSize.width = 1024;
		spotLight.shadow.mapSize.height = 1024;
		transform
			.add(ambientLight)
			.add(spotLight);
	}
}

const handleRuntimeReady = (runtime) => {
	console.info('handleRuntimeReady(runtime);');
	const camControl = new CamControl(runtime);
	camControl.setCamera(new Vector3(0, 16, 3), new Vector3(0, 0, 0.4));
	const {entities, entity} = runtime;
	entities.createEntity([Environment]);
	
	for(var i = 0; i < 3; i++) {
		entities
			.createEntity([CardMesh])
			.transform.translateX(i * 2).entity
			.transform.translateZ(i * 2).entity
			.transform.translateY(2);
	}

	const scene = entities.findComponent(Scene);
	const {floor} = entities.findComponent(Environment);
	const cards = entities.queryComponents([CardMesh]);

	floor.addEventListener('mousedown', function(event) {
		cards.forEach(({transform}) => scene.add(transform));
	});

	cards.forEach(({cardMesh}) => {
		cardMesh.receiveMouseEvents = true;
		cardMesh.addEventListener('mousedown', function(event) {
			const {entity: {transform, transform: {parent}}} = this;
			parent.remove(transform);
		});
	});

	console.log(
		entities
			.queryComponents([CardData])
			.map(({cardData}) => cardData.toString())
			.join('\n')
	);
	console.log(entities.all.join('\n'));
};
const init = () =>
	new EntityManager()
		.createEntity([Runtime, Cursor])
			.on('ready', handleRuntimeReady)
			.runtime.start();

document.addEventListener('DOMContentLoaded', init);
	
})();