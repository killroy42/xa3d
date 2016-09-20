(function() {
const THREE = require('THREE');
const enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
const THREEPrototype = require('THREEPrototype');
const GeometryHelpers = require('GeometryHelpers');
const initLights = require('initLights');
const createRng = require('portable-rng');
const DatGui = require('dat').GUI;
const MouseHandler = require('MouseHandler');
const MouseCursor = require('MouseCursor');
const EventDispatcher = require('EventDispatcher');
const XenoECS = require('XenoECS');

const {isEqual, cloneDeep, throttle} = require('_');
const {
	Vector3,
	Object3D,
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
const {Entity, Component, System, EntityManager} = XenoECS;

const gridSize = 100;
const renderList = [];

// Helpers
	const white = new Color(0xffffff);
	const red = new Color(0xff0000);
	const green = new Color(0x00ff00);
	const yellow = new Color(0xffff00);
	const whiteLine = new LineBasicMaterial({color: white});
	const greenLine = new LineBasicMaterial({color: green});
	const redLine = new LineBasicMaterial({color: red});
	const blue = new LineBasicMaterial({color: 0x0000ff});
	const yellowLine = new LineBasicMaterial({color: yellow});
	const magenta = new LineBasicMaterial({color: 0xff00ff});
	const teal = new LineBasicMaterial({color: 0x00ffff});
	const p2v = (x = 0, y = 0, z = 0) => Array.isArray(x)
		?new Vector3(x[0], x[1], x[2])
		:new Vector3(x, y, z);
	const makeLine = (points, mat) => {
		var geo = new Geometry();
		/*
		geo.vertices = points.map((v) => {
			if(!(v instanceof THREE.Vector3)) v = p2v(v);
			return new THREE.Vector3(v.x, v.z, -v.y);
		});
		*/
		geo.vertices = points.map(({x, y, z}) => new Vector3(x, y, z));
		const line = new Line(geo, mat);
		line.name = 'line';
		return line;
	};
	const getCornerPoints = (x1, y1, x2, y2) => {
		const offset = 1 - (4/3)*Math.tan(Math.PI/8);
		return {
			a: {x: -x1, y: -y1},
			b: {x: -x1 * offset, y: -y1 * offset},
			c: {x: x2 * offset, y: y2 * offset},
			d: {x: x2, y: y2},
		};
	};
	const makeRect = (w, h, r) => {
		const w2 = w * 0.5;
		const h2 = h * 0.5;
		const tl = getCornerPoints(  0, -r,  r,  0);
		const tr = getCornerPoints(  r,  0,  0,  r);
		const br = getCornerPoints(  0,  r, -r,  0);
		const bl = getCornerPoints( -r,  0,  0, -r);
		return [
			Object.assign({x: -w2, y: -h2}, tl),
			Object.assign({x:  w2, y: -h2}, tr),
			Object.assign({x:  w2, y:  h2}, br),
			Object.assign({x: -w2, y:  h2}, bl),
		];
	};
	const makeRoundedRectShape = (xo, yo, w, h, r) => {
		const shape = new THREE.Shape();
		var corners = makeRect(w, h, r);
		const {x, y, a} = corners[0];
		shape.moveTo(xo + x + a.x, yo + y + a.y);
		corners.forEach(({x, y, a, b, c, d}) => {
			shape.lineTo(xo + x + a.x, yo + y + a.y);
			shape.bezierCurveTo(
				xo + x + b.x, yo + y + b.y,
				xo + x + c.x, yo + y + c.y,
				xo + x + d.x, yo + y + d.y
			);
		});
		shape.lineTo(xo + x + a.x, yo + y + a.y);
		return shape;
	};

// Menu helpers
		const indentMenu = (menu, indent = '\u2003\u2002') => {
			const res = {};
			for(var key in menu) {
				res[indent+key] = menu[key];
				if(res[indent+key].children)
						res[indent+key].children =
							indentMenu(res[indent+key].children, indent+'\u2003');
			}
			return res;
		};

// Entity Helpers
	const getClosestEntity = (entities, targetPosition) =>
		entities.reduce(({dist, entity}, {transform: {position}}, idx, arr) => {
			const nextDist = targetPosition.distanceToSquared(position);
			return (dist <= nextDist)?{dist, entity}:{dist: nextDist, entity: arr[idx]};
		}, {dist: Number.MAX_VALUE}).entity;

// Components
	class Transform extends Component {
		constructor() {
			super();
			this._object3d = new Object3D();
			Object.defineProperties(this, {
				position: {get: () => this._object3d.position},
				scale: {get: () => this._object3d.scale},
				rotation: {get: () => this._object3d.rotation},
				add: {value: (obj) => this._object3d.add(obj)},
				object3d: {get: () => this._object3d},
			});
		}
		addTo(object3d) {
			object3d.add(this.object3d);
		}
		OnDetachComponent(entity) {
			this.object3d.remove(...this.object3d.children);
			this.object3d.parent.remove(this.object3d);
		}
	}

// Card
	class CardData extends Component {
		constructor() {
			super();
			this.name = 'Card';
		}
	}
	class CardView extends Component {
		constructor() {
			super();
			this.width = 2;
			this.height = 3;
			this.cornerRadius = 0.2;
			this._mesh = undefined;
		}
		OnAttachComponent(entity) {
			const {transform} = entity;
			const {width, height, cornerRadius, _root} = this;
			const shape = makeRoundedRectShape(0, 0, width, height, cornerRadius);
			const geo = shape.createPointsGeometry(12);
			geo.rotateX(0.5 * Math.PI);
			geo.computeBoundingBox();
			const outline = new Line(geo, yellowLine);
			transform.add(outline);
			this._mesh = outline;
		}
	}
	class CardSystem extends System {
		constructor() {
			super();
			this.setComponents([CardData, Transform, CardView]);
		}
	}
	const cardMaker = (app, defaults) => ({position} = defaults, entity) => {
		const {scene} = app;
		entity
			//.addTag('selectable')
			.addComponent(CardData)
			.addComponent(Transform)
			.addComponent(CardView);
		const {transform} = entity;
		transform.addTo(scene);
		transform.position.copy(position);
		return entity;
	};

// Places
	const cardDisplay = {
		grid: (place) => {
			const {transform, placeData} = place;
			const {display, cards} = placeData;
			var max = 7;
			var slotW = transform.scale.x / max;
			var slotH = transform.scale.z;
			var totalW = cards.length * slotW;
			cards.forEach(({cardView: {_mesh}, transform: {position, rotation}}, idx) => {
				position.copy(place.transform.position);
				rotation.copy(place.transform.rotation);
				_mesh.visible = true;
				position.x += -0.5 * totalW + (idx + 0.5) * slotW;
			});
		},
		fan: (place) => {
			const {transform, placeData} = place;
			const {display, cards} = placeData;
			const len = 10;//cards.length;
			var max = 10;
			var slotW = transform.scale.x / max;
			var slotH = transform.scale.z;
			var totalW = len * slotW;
			cards.forEach(({cardView: {_mesh}, transform: {_object3d, position, rotation}}, idx) => {
				position.set(0, 0, 0);
				rotation.copy(place.transform.rotation);
				_mesh.visible = true;
				position.x += -0.5 * totalW + (idx + 0.5) * slotW;
				position.z += (0.5 + Math.sin((1 + 1 * idx / (max - 1)) * Math.PI)) * 0.5 * slotH;
				console.log(place.transform.rotation);
				position.applyEuler(place.transform.rotation);
				position.add(place.transform.position);
				_object3d.rotateY((1.2 - 0.4 * idx / (max - 1)) * Math.PI);
			});
		},
		stack: (place) => {
			const {transform, placeData} = place;
			const {display, cards} = placeData;
			var max = 30;
			var slotW = transform.scale.x / max;
			var slotH = transform.scale.z;
			var totalW = cards.length * slotW;
			cards.forEach(({cardView: {_mesh}, transform: {position, rotation}}, idx) => {
				position.copy(place.transform.position);
				rotation.copy(place.transform.rotation);
				_mesh.visible = true;
				position.x += -0.5 * totalW + (idx + 0.5) * slotW;
			});
		},
		hidden: (place) => {
			const {transform, placeData} = place;
			const {display, cards} = placeData;
			cards.forEach(({cardView: {_mesh}, transform: {position, rotation}}, idx) => {
				position.copy(place.transform.position);
				rotation.copy(place.transform.rotation);
				_mesh.visible = false;
			});
		},
	};
	const placeGeo = new Geometry();
	placeGeo.vertices = [
		[-0.5, 0, -0.5],
		[ 0.5, 0, -0.5],
		[ 0.5, 0,  0.5],
		[-0.5, 0,  0.5],
		[-0.5, 0, -0.5],
	].map(([x, y, z]) => new Vector3(x, y, z));
	const placeOutline = new Line(placeGeo, whiteLine);
	placeOutline.name = 'placeOutline';
	class PlaceData extends Component {
		constructor() {
			super();
			this.name = 'Place';
			this.display = 'hidden';
			this.cards = [];
		}
		toJSON() {
			const {_entity, name, display, cards} = this;
			const {position, scale, rotation} = _entity.transform;
			return {name, display, position, scale, rotation, cards: cards.length};
		}
	}
	class PlaceView extends Component {
		constructor() {
			super();
			this._mesh = placeOutline.clone();
		}
		OnAttachComponent(entity) {
			const {transform} = entity;
			transform.add(this._mesh);
		}
		OnDetachComponent(entity) {
			const {transform} = entity;
			//transform.remove(this.mesh);
		}
		arrangeCards() {
			//console.info('PlaceView.arrangeCards();');
			const {_entity} = this;
			const {transform, placeData} = _entity;
			const {display} = placeData;
			if(cardDisplay[display]) cardDisplay[display](_entity);
		}
	}
	class PlaceGui extends Component {
		get(prop) {
			const {_entity} = this;
			const {transform, placeData} = _entity;
			const {position, scale, rotation} = transform.object3d;
			if(/^position\./.test(prop)) return position[prop.split('.')[1]];
			if(/^scale\./.test(prop)) return scale[prop.split('.')[1]];
			if(/^rotation\./.test(prop)) return rotation[prop.split('.')[1]];
			if(/^cards.amount$/.test(prop)) return placeData.cards.length;
			var val = placeData[prop.toLowerCase()];
			if(val === undefined) val = '';
			return val;
		}
		set(prop, val) {
			const {_entity} = this;
			const {transform, placeData} = _entity;
			const {position, scale, rotation} = transform.object3d;
			if(/^position\./.test(prop)) return position[prop.split('.')[1]] = parseFloat(val);
			if(/^scale\./.test(prop)) return scale[prop.split('.')[1]] = parseFloat(val);
			if(/^rotation\./.test(prop)) return rotation[prop.split('.')[1]] = parseFloat(val);
			if(/^cards.amount$/.test(prop)) return placeData.cards.length;
			return placeData[prop.toLowerCase()] = val;
		}
	}
	class PlaceSystem extends System {
		constructor() {
			super();
			this.setComponents([PlaceData, Transform, PlaceView]);
		}
		loadPlacesFromJson(json) {
			this.removeAllEntities();
			json && json.places && json.places.forEach((data) => this.create(data));
			return this;
		}
		savePlacesToJson() {
			const places = this.getEntities();
			return {places: places.map(place => place.placeData.toJSON())};
		}
	}
	const placeMaker = (app, defaults) => ({name, display, cards, position, scale, rotation} = defaults, entity) => {
		const {scene, cards: cardSystem} = app;
		entity
			.addTag('selectable')
			.addComponent(PlaceData)
			.addComponent(Transform)
			.addComponent(PlaceView)
			.addComponent(PlaceGui);
		const {placeData, transform, placeView} = entity;
		transform.addTo(scene);
		transform.position.copy(position);
		transform.scale.copy(scale);
		transform.rotation.copy(rotation || new Vector3);
		placeData.name = name;
		placeData.display = display;
		for(var i = 0; i < cards; i++)
			placeData.cards.push(cardSystem.create());
		placeView.arrangeCards();
		return entity;
	};

// GUI
	class KeyHandler extends Component {
		constructor() {
			super();
			EventDispatcher.apply(this);
			this._pressedKeys = {};
			this.handleKeyDown = this.handleKeyDown.bind(this);
			this.handleKeyUp = this.handleKeyUp.bind(this);
		}
		handleKeyDown({key, repeat}) {
			const {_pressedKeys} = this;
			//if(repeat) return;
			_pressedKeys[key] = true;
			this.dispatchEvent('keydown', event);
			}
		handleKeyUp({key, repeat}) {
			const {_pressedKeys} = this;
			//if(repeat) return;
			_pressedKeys[key] = false;
			this.dispatchEvent('keyup', event);
		}
		attachKeyEvents(target) {
			target.addEventListener('keydown', this.handleKeyDown);
			target.addEventListener('keyup', this.handleKeyUp);
		}
		isPressed(key) {
			return this._pressedKeys[key];
		}
	}
	class GuiControl extends Component {
		constructor() {
			super();
			EventDispatcher.apply(this);
			this._pointer = undefined;
			this._control = undefined;
			this.handleKey = this.handleKey.bind(this);
			this.handleMouseDown = this.handleMouseDown.bind(this);
			this.handleChange = this.handleChange.bind(this);
		}
		handleMouseDown(event) {
			const {_entity} = this;
			const {keyHandler: key} = _entity;
			const {point} = event.intersection;
			const Shift = key.isPressed('Shift');
			const Alt = key.isPressed('Alt');
			this.dispatchEvent('select', event);
			if(Shift && Alt) this.dispatchEvent('delete', event);
			if(Shift && !Alt) this.dispatchEvent('create', event);
		}
		handleKey(event) {
			const {keyHandler: key} = this._entity;
			MouseCursor.COLOR_IDLE = key.isPressed('Shift')?
				key.isPressed('Alt')?0xff0000:0x00ff00
				:MouseCursor._COLOR_IDLE;
			this._pointer.cursor.setColor(MouseCursor.COLOR_IDLE);
		}
		handleChange(event) {
			this.dispatchEvent('change', event);
		}
		OnAttachComponent(entity) {
			const {keyHandler} = entity;
			const handleKey = (event) => {
				MouseCursor.COLOR_IDLE = keyHandler.isPressed('Shift')?
					keyHandler.isPressed('Alt')?0xff0000:0x00ff00
					:MouseCursor._COLOR_IDLE;
				this._pointer.cursor.setColor(MouseCursor.COLOR_IDLE);
			};
			keyHandler
				.addEventListener('keydown', this.handleKey)
				.addEventListener('keyup', this.handleKey);
		}
		attachToApp({camera, renderer, pointer}) {
			const {_entity, _pressedKeys} = this;
			const {transform} = _entity;
			const control = new TransformControls(camera, renderer.domElement);
			transform.add(control);
			control.addEventListener('change', this.handleChange);
			this._pointer = pointer;
			this._control = control;
			return this;
		}
	}
	class Gui extends Component {
		constructor() {
			super();
			EventDispatcher.apply(this);
			this._dat = new DatGui();
			this._places = undefined;
			this._selected = undefined;
			this.handleSelect = this.handleSelect.bind(this);
			this.handleCreate = this.handleCreate.bind(this);
			this.handleDelete = this.handleDelete.bind(this);
			this.handleKeyDown = this.handleKeyDown.bind(this);
			this.handleControlChange = this.handleControlChange.bind(this);
			this.selectedGetProp = this.selectedGetProp.bind(this);
			this.selectedSetProp = throttle(this.selectedSetProp.bind(this), 100, {leading: true, trailing: true});
			this.historySnapshot = throttle(this.historySnapshot.bind(this), 1000, {leading: true, trailing: true});
			this.placeNum = 0;
			this._menus = [];
			this._history = [];
			this._maxHistoryLength = 100;
		}
		handleSelect(event) {
			const {_entity, _places} = this;
			const {point} = event.intersection;
			this.select(getClosestEntity(_entity._manager.queryTags('selectable'), point));
			this.dispatchEvent('select', this._selected);
		}
		historySnapshot() {
			const {_places, _history} = this;
			const prevState = _history[_history.length - 1];
			const nextState = JSON.stringify(_places.savePlacesToJson());
			if(prevState !== nextState) _history.push(nextState);
			if(_history.length > this._maxHistoryLength)
				_history.splice(this._maxHistoryLength, _history.length);
		}
		historyUndo() {
			const {_places, _history} = this;
			if(_history.length === 0) return;
			this.select();
			_places.loadPlacesFromJson(JSON.parse(_history.pop()));
			this.refresh();	
		}
		handleCreate(event) {
			const {_places, _history} = this;
			const {point} = event.intersection;
			this.historySnapshot();
			const place = _places.create({
				name: 'Place '+(++this.placeNum),
				display: 'hidden',
				position: point.clone().add(new Vector3(0, 0.1, 0)),
				scale: new Vector3(3, 1, 2)
			});
			this.select(place);
		}
		handleDelete(event) {
			const {_places} = this;
			this.historySnapshot();
			_places.remove(this.getSelected());
			this.select();
		}
		handleKeyDown(event) {
			const {key, repeat} = event;
			const {guiControl, keyHandler} = this._entity;
			if(key === 'z' && keyHandler.isPressed('Control')) {
				this.historyUndo();
			}
			if(repeat) return;
			switch(key) {
				case 'v': guiControl._control.setMode('translate'); break;
				case 's': guiControl._control.setMode('scale'); break;
				case 'r': guiControl._control.setMode('rotate'); break;
			}
		}
		handleControlChange(event) {
			this.refresh();
		}
		OnAttachComponent(entity) {
			const {guiControl, keyHandler} = entity;
			guiControl.addEventListener('select', this.handleSelect);
			guiControl.addEventListener('create', this.handleCreate);
			guiControl.addEventListener('delete', this.handleDelete);
			guiControl.addEventListener('change', this.handleControlChange);
			keyHandler.addEventListener('keydown', this.handleKeyDown);
		}
		init(app, places) {
			const {_entity} = this;
			const {transform, guiControl, keyHandler} = _entity;
			const {scene} = app;
			this._places = places;
			transform.addTo(scene);
			const board = scene.getObjectByName('board');
			board.addEventListener('mousedown', guiControl.handleMouseDown);
			guiControl.attachToApp(app);
			keyHandler.attachKeyEvents(window);
		}
		selectedGetProp(name) {
			const place = this.getSelected();
			if(place === undefined) return 'n/a';
			const prevVal = place.placeGui.get(name);
			return place.placeGui.get(name);
		}
		selectedSetProp(name, nextVal) {
			const place = this.getSelected();
			if(place === undefined) return;
			this.historySnapshot();
			place.placeGui.set(name, nextVal);
			this.dispatchEvent('propchange', place, name,  nextVal);
			return nextVal;
		}
		addMenu(name, menu) {
			const {_menus} = this;
			_menus.push({name, open: false, menu: indentMenu(menu)});
			this.refreshMenu();
		}
		refreshMenu() {
			const {_menus} = this;
			const menuProps = {};
			_menus.forEach(({name, open, menu}) => {
				const menuName = (open?'\u25BC':'\u25B6')+'\u2002'+name;
				menuProps[menuName] = () => this.toggleMenu(name);
				if(open) Object.assign(menuProps, menu);
			});
			this.clear();
			this.setProps(menuProps, this.selectedGetProp, this.selectedSetProp);
		}
		toggleMenu(name, open) {
			const {_menus} = this;
			_menus.forEach((menuItem) => {
				if(menuItem.name === name) {
					const nextOpen = (open !== undefined)?open:!menuItem.open;
					if(menuItem.open !== nextOpen) {
						menuItem.open = nextOpen;
						this.refreshMenu();
					}
				}
			});
		}
		clear(dat) {
			if(dat === undefined) dat = this._dat;
			const {__controllers, __folders, __ul} = dat;
			Object.keys(__folders).forEach(key => {
				__folders[key].close();
				this.clear(__folders[key]);
				__ul.removeChild(__folders[key].domElement.parentNode);
				delete __folders[key];
			});
			while(__controllers.length > 0) dat.remove(__controllers[0]);
			dat.onResize();
		}
		refresh(dat) {
			if(dat === undefined) dat = this._dat;
			Object.keys(dat.__folders).forEach(key => this.refresh(dat.__folders[key]));
			dat.__controllers.forEach(ctrl => ctrl.setValue(ctrl.object[ctrl.property]));
		}
		getPropName(parent, prop) {
			const sanitize = (name) => name.toLowerCase()
				.replace(/[^a-z0-9\.\-\_]+/ig, '');
			const name = (parent?sanitize(parent)+'.':'')+sanitize(prop);
			return name;
		}
		createGuiProperties(props, get, set) {
			const createGetterSetter = (propName) => ({
				get: () => get(propName),
				set: (val) => set(propName, val)
			});
			const createProps = (props, parent) => {
				const propsDefined = {};
				Object.keys(props).forEach(key => {
					const propName = this.getPropName(parent, key);
					switch(typeof props[key]) {
						case 'object':
							if(Array.isArray(props[key])) {
								propsDefined[key] = createGetterSetter(propName);
								break;
							}
							propsDefined[key] = {value: createProps(props[key].children, propName)};
							break;
						case 'function': propsDefined[key] = {value: props[key]}; break;
						default: propsDefined[key] = createGetterSetter(propName);
					}
				});
				return Object.defineProperties({}, propsDefined); 
			};
			return createProps(props);
		}
		createGui(gui, props, vals) {
			Object.keys(props).forEach(key => {
				if(Array.isArray(props[key])) return gui.add(vals, key, props[key]);
				if(typeof props[key] === 'function') return gui.add(vals, key);
				if(typeof props[key] === 'object') {
					var folder = gui.addFolder(key);
					if(props[key].open) folder.open();
					this.createGui(folder, props[key].children, vals[key]);
					return folder;
				}
				console.log(key, typeof props[key]);
				return gui.add(vals, key);
			});
		}
		setProps(props, getProp, setProp) {
			const guiProps = this.createGuiProperties(props, getProp, setProp);
			this.createGui(this._dat, props, guiProps);
		}
		select(nextSelected) {
			const {_entity, _selected} = this;
			const {guiControl} = _entity;
			const {_control} = guiControl;
			if(_selected === nextSelected) return;
			if(nextSelected && nextSelected.transform) {
				_control.attach(nextSelected.transform.object3d);
				this.toggleMenu('PLACE', true);
			} else {
				_control.detach();
			}
			this._selected = nextSelected;
			this.refresh();
		}
		getSelected() {
			return this._selected;
		}
	}


// Init
	function testPlaceCards(app) {
		console.info('testPlaceCards(app);');
		const {entityManager, places, cards: cardSystem} = app;
		const {gui} = entityManager.queryComponents(Gui)[0];
		gui.addEventListener('select', (selected) => {
			//console.log('Select: "%s"', selected.placeData.name);
		});
		gui.addEventListener('propchange', (selected, prop, val) => {
			//console.log('propchange: "%s"', selected.placeData.name, prop, val);
			selected.placeView.arrangeCards();
		});
	}
	function initSystems(app) {
		// EntityManager
			const entityManager = new EntityManager();
			app.entityManager = entityManager;
		// Cards
			const cards = new CardSystem()
				.setManager(entityManager)
				.setMaker(cardMaker(app, {position: new Vector3()}));
			app.cards = cards;
		// Places
			const placeDefaults = {
				name: 'Place',
				display: 'hidden',
				position: new Vector3(),
				scale: new Vector3(1, 1, 1),
			};
			const places = new PlaceSystem()
				.setManager(entityManager)
				.setMaker(placeMaker(app, placeDefaults));
			app.places = places;
	}
	function initGUI(app) {
		const {entityManager, places, cards} = app;
		const guiEntity = entityManager.createEntity()
			.addComponent(Transform)
			.addComponent(KeyHandler)
			.addComponent(GuiControl)
			.addComponent(Gui);
		const {gui} = guiEntity;
		gui.init(app, places);
		const SAVED_PLACES_KEY = 'savedPlaces';
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
		const placesInspector = {
			Name: 'Name',
			Display: ['hidden', 'stack', 'grid', 'fan'],
			Position: {
				open: false,
				children: {x: 0, y: 0, z: 0}
			},
			Scale: {
				open: false,
				children: {x: 1, y: 1, z: 1}
			},
			Rotation: {
				open: false,
				children: {x: 1, y: 1, z: 1}
			},
			Cards: {
				open: true,
				children: {
					Amount: 0,
					'Add Card': () => {
						console.log('Add Card');
						const selected = gui.getSelected();
						const {transform, placeData, placeView} = selected;
						placeData.cards.push(cards.create({position: transform.position}));
						gui.refresh();
						placeView.arrangeCards();
					},
					'Remove Card': () => {
						console.log('Remove Card');
						const selected = gui.getSelected();
						const {transform, placeData, placeView} = selected;
						const removed = placeData.cards.pop();
						if(removed) removed.destroy();
						gui.refresh();
						placeView.arrangeCards();
					},
				}
			},
		};
		gui.addMenu('FILE', fileMenu);
		gui.addMenu('PLACE', placesInspector);
		gui.toggleMenu('PLACE', true);
		fileMenu.Load();
	}
	function initEditor(app) {
		const {scene} = app;
		const floor = new Mesh(
			new PlaneGeometry(gridSize, gridSize, gridSize, gridSize),
			new MeshPhongMaterial({color: 0x555555})
		);
		floor.name = 'floor';
		floor.rotateX(-90 * Math.PI / 180);
		floor.renderOrder  = -1;
		floor.receiveMouseEvents = true;
		scene.add(floor);
		//scene.add(new THREE.WireframeHelper(floor, 0x00ff00));
		const floorGrid = new GridHelper(gridSize / 2, gridSize);
		floorGrid.position.set(0, 0.001, 0);
		floorGrid.name = 'floorGrid';
		//floorGrid.rotateX(-90 * Math.PI / 180);
		scene.add(floorGrid);
		const board = new Mesh(
			//new PlaneGeometry(16, 12, 1, 1),
			new BoxGeometry(16, 12, 0.1),
			new MeshPhongMaterial({color: 0xcccccc})
		);
		board.name = 'board';
		board.rotateX(-90 * Math.PI / 180);
		board.position.set(0, 0.5, 0);
		board.receiveMouseEvents = true;
		scene.add(board);
	}
	function Prototype_init() {
		const app = this;
		const {scene, camera, renderer} = app;
		const mouseHandler = new MouseHandler({
			domElement: renderer.domElement, camera, scene
		});
		const pointer = new MouseCursor({scene}).attach(mouseHandler);
		pointer.cursor.scale.set(0.02, 0.02, 0.02);
		app.pointer = pointer;
		
		app.setCamera(new Vector3(0, 16, 3), new Vector3(0, 0, 0.4));
		initLights(app);
		initEditor(app);
		initSystems(app);
		initGUI(app);
		testPlaceCards(app);
		app.onrender = (time) => {
			renderList.forEach((handler) => handler(time));
		};
	}
	function init() {
		var prototype = new THREEPrototype({
			fov: 50
		});
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();