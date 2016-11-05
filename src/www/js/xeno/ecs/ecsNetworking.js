(() => {
const {
	Vector3, Object3D,
	Mesh, CubeGeometry, MeshPhongMaterial,
	PlaneGeometry, 
} = require('THREE');
const {Entity, Component, System, EntityManager} = require('XenoECS');
const {
	Transform,
	SceneComponent,
	Collider,
	ControlView,
	Wrapper,
	App,
} = require('components');
const {KeyHandler, GuiControl, ControlHandle} = require('ecsGuiCore');
const WebSocketConnection = require('WebSocketConnection');
const NetworkClient = require('NetworkClient');
const UserBlueprint = require('UserBlueprint');
const EditorBlueprint = require('EditorBlueprint');
const NetObjectBlueprint = require('NetObjectBlueprint');


class NetId extends Wrapper {
	constructor() {
		super();
	}
}


class NetClient extends Component {
	constructor() {
		super();
		this.conn = new WebSocketConnection();
		this.client = new NetworkClient();
		this.context = {netClient: this};
	}
	OnAttachComponent(entity) {
		this.handleConnected = this.getEntity().delegate('connected');
		this.conn.on('connected', this.handleConnected);
	}
	connect(opts) {
		const {conn, client} = this;
		conn.connect(opts);
		client.connect(conn);
	}
	registerBlueprint(...args) {
		//console.info('NetClient.registerBlueprint("%s", ...);', ...args);
		this.client.registerBlueprint(...args);
		return this;
	}
	instantiateBlueprint(...args) {
		return this.client.instantiateBlueprint(...args);
	}
}

class NetUser extends Component {
	constructor() {
		super();
		this.context = {};
		this.handleConnected = this.handleConnected.bind(this);
		this.handleClientready = this.handleClientready.bind(this);
	}
	OnAttachComponent(entity) {
		//console.info('NetEditor.OnAttachComponent(entity);');
		const entityManager = this.getManager();
		const app = entityManager.findComponent(App);
		const netClient = this.getComponent(NetClient);
		entity.addEventListener('connected', this.handleConnected);
		entityManager.registerComponents([
			NetId,
			Transform,
			Collider,
			ControlView,
			ControlHandle,
		]);
		this.context.app = app;
		this.context.scene = app.scene;
		this.context.loadTexture = app.loadTexture;
		this.context.entityManager = entityManager;
		//netClient.registerBlueprint('UserBlueprint', UserBlueprint, this.context);
		const blueprints = {
			UserBlueprint: UserBlueprint,
			EditorBlueprint: EditorBlueprint,
			NetObjectBlueprint: NetObjectBlueprint,
		};
		netClient.registerBlueprint(blueprints, this.context);
	}
	handleConnected(event) {
		//console.info('NetEditor.handleConnected(event);');
		const netClient = this.getComponent(NetClient);
		const user = this.user = netClient.instantiateBlueprint('UserBlueprint');
		user.addEventListener('clientready', this.handleClientready);
	}
	handleClientready(event) {
		//console.info('NetEditor.handleClientready(event);');
		const entity = this.getEntity();
		this.createInteractionPlane();
		entity.dispatchEvent('clientready', event);
		this.initCamHandler();
		this.initControlHandler();
	}
	handleCreateNewObject(point) {
		//console.info('NetEditor.handleCreateNewObject(point);');
		this.user.createNetObject({
			components: [
			'Transform',
			'Collider',
			'ControlView',
			'ControlHandle',
			],
			position: point
		});
	}
	initCamHandler() {
		const entityManager = this.getManager();
		const {
			mouseHandler, camera, controls, fpsControls
			} = entityManager.findComponent(App);
		const {netId} = this.user;
		const camPos = new Vector3();
		const camDir = new Vector3();
		const changeEvent = {
			event: 'camchange',
			position: new Vector3(),
			direction: new Vector3(),
		};
		this.handleMousemove = (event) => {
			if(event.intersection) {
				netId.send({event: 'mousemove', point: event.intersection.point});
			}
		};
		this.handleControlChange = (event) => {
			camera.getWorldPosition(changeEvent.position);
			camera.getWorldDirection(changeEvent.direction);
			netId.send(changeEvent);
		};
		mouseHandler.addEventListener('mousemove', this.handleMousemove);
		controls.addEventListener('change', this.handleControlChange);
		fpsControls.addEventListener('change', this.handleControlChange);
		this.handleControlChange();
	}
	initControlHandler() {
		const {user: {netId}} = this;
		const em = this.getManager();
		const guiControl = em.findComponent(GuiControl);
		const changeEvent = {
			event: 'objchange',
			id: null,
			position: new Vector3()
		};
		guiControl.addEventListener('change', (event) => {
			const {entity: {netId: {id}, transform: {position}}} = event.target.object.userData;
			//console.log('id:', entity.netId._target.id);
			//console.log('id:', entity.netId.id);
			changeEvent.id = id;
			changeEvent.position.copy(position);
			netId.send(changeEvent);
		});
	}
	createInteractionPlane() {
		//console.info('NetEditor.createInteractionPlane();');
		const em = this.getManager();
		const {scene} = em.findComponent(App);
		const plane = new Mesh(new PlaneGeometry(1000, 1000, 1, 1), new MeshPhongMaterial({color: 0xff00ff}));
		plane.name = 'plane';
		plane.material.visible = false;
		plane.rotateX(-90 * Math.PI / 180);
		plane.renderOrder  = -1;
		plane.receiveMouseEvents = true;
		plane.position.set(0, 0.1, 0);
		plane.visible = true;
		scene.add(plane);
		const keyHandler = em.findComponent('KeyHandler');
		const handlePlaneMousedown = (event) => {
			const {point} = event.intersection;
			if(event.button === 0 && keyHandler.isPressed('Shift')) {
				//console.log('Shift-LeftClick');
				this.handleCreateNewObject(point);
			}
			else if(event.button === 0 && keyHandler.isPressed('Alt')) {
				console.log('Alt-LeftClick');
			}
			else if(event.button === 0) {
				//console.log('LeftClick');
			}
		};
		plane.addEventListener('mousedown', handlePlaneMousedown);
	}
}

class NetEntity extends Component {
}


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		NetClient,
		NetUser,
	};
	module.exports.ecsNetworking = module.exports;
}
})();