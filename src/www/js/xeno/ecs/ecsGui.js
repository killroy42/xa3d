(() => {
/* jshint validthis: true */
'use strict';

const {Entity, Component, System, EntityManager} = require('XenoECS');
const {Vector3, TransformControls, Raycaster} = require('THREE');
const DatGui = require('dat').GUI;
const EventDispatcher = require('EventDispatcher');
const MouseCursor = require('MouseCursor');
const {colors, dimensions} = require('assetdata');
const {makeRoundedRectShape} = require('GeometryHelpers');
const {Transform, Collider} = require('components');
const {PlaceData, PlaceView, PlaceGui, placeDisplayFunctions} = require('ecsPlaces');
const {Selected, Selectable} = require('ecsSelectable');
const {throttle} = require('_');

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
		this.handleChange = this.handleChange.bind(this);
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
		this._cards = undefined;
		this._selected = undefined;
		this.handlePlaceMouseDown = this.handlePlaceMouseDown.bind(this);
		this.handleBoardMousedown = this.handleBoardMousedown.bind(this);
		this.handleElsewhereMousedown = this.handleElsewhereMousedown.bind(this);
		this.handleSelect = this.handleSelect.bind(this);
		this.handleDeselect = this.handleDeselect.bind(this);
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.handleControlChange = this.handleControlChange.bind(this);
		this.selectedGetProp = this.selectedGetProp.bind(this);
		//this.selectedSetProp = throttle(this.selectedSetProp.bind(this), 50, {leading: true, trailing: true});
		this.selectedSetProp = this.selectedSetProp.bind(this);
		this.historySnapshot = throttle(this.historySnapshot.bind(this), 1000, {leading: true, trailing: true});
		this.placeNum = 0;
		this._menus = [];
		this._menuState = {};
		this._history = [];
		this._maxHistoryLength = 100;
	}
	init(app, places, cards) {
		const {_entity} = this;
		const guiControl = this.getComponent(GuiControl);
		const keyHandler = this.getComponent(KeyHandler);
		const transform = this.getComponent(Transform);
		const manager = this.getManager();
		const {scene, mouseHandler} = app;
		this._app = app;
		this._places = places;
		this._cards = cards;
		transform.addTo(scene);
		guiControl.attachToApp(app);
		keyHandler.attachKeyEvents(window);
		const selected = manager.createSystem(Selected);
		this._selected = undefined;
		selected.addEventListener('deselect', this.handleDeselect);
		selected.addEventListener('select', this.handleSelect);
		manager.addEventListener('addcomponent', ({Component, entity}) => {
			if(Component === Collider && entity.hasComponent(PlaceGui)) {
				entity.collider.object3d.addEventListener('mousedown', this.handlePlaceMouseDown);
			}
		});
		manager.addEventListener('removecomponent', ({Component, entity}) => {
			if(Component === Collider && entity.hasComponent(PlaceGui)) {
				entity.collider.object3d.removeEventListener('mousedown', this.handlePlaceMouseDown);
			}
		});
		const board = scene.getObjectByName('board_collider');
		board.addEventListener('mousedown', this.handleBoardMousedown);
		mouseHandler.addEventListener('mousedown', this.handleElsewhereMousedown);
		this.checkControlGizmoHit = this.createControlGizmoChecker();
	}
	createControlGizmoChecker() {
		const {camera, mouseHandler: {domElement}} = this._app;
		const {_control} = this.getComponent(GuiControl);
		const ray = new Raycaster();
		const pointerVector = new Vector3();
		return ({clientX, clientY}) => {
			if(!_control.visible) return false;
			const currentControl = _control.children.filter(({visible}) => visible)[0];
			const objects = currentControl.pickers.children;
			const rect = domElement.getBoundingClientRect();
			const x = (clientX - rect.left) / rect.width;
			const y = (clientY - rect.top) / rect.height;
			pointerVector.set((x * 2) - 1, - (y * 2) + 1);
			ray.setFromCamera(pointerVector, camera);
			const hitGizmo = ray.intersectObjects(objects, true).length > 0;
			return hitGizmo;
		};
	}
	handleBoardMousedown(event) {
		//console.info('Gui.handleBoardMousedown(event);');
		if(this.checkControlGizmoHit(event)) return;
		const {intersection: {point}, originalEvent: {altKey, shiftKey}} = event;
		if(shiftKey && !altKey) {
			this.createPlace(point);
		} else {
			//this.select();
		}
	}
	handleElsewhereMousedown(event) {
		//console.info('Gui.handleElsewhereMousedown(event);');
		if(this.checkControlGizmoHit(event)) return;
		const canSelect = (event.intersection &&
			event.intersection.object &&
			event.intersection.object.userData.entity && 
			event.intersection.object.userData.entity.hasComponent(Selectable)) === true;
		if(!canSelect) this.select();
	}
	handleSelect(event) {
		const {_control} = this.getComponent(GuiControl);
		const {target, target: {transform: {object3d}}} = event;
		_control.attach(object3d);
		this.inspect(target);
		this._selected = target;
	}
	handleDeselect(event) {
		const {_control} = this.getComponent(GuiControl);
		_control.detach();
		this.refresh();
		this._selected = undefined;
		this.inspect();
	}
	handlePlaceMouseDown(event) {
		const {keyHandler: key} = this.getEntity();
		const {target: {userData: {entity}}} = event;
		const Shift = key.isPressed('Shift');
		const Alt = key.isPressed('Alt');
		if(Shift && Alt) this.deletePlace(entity);
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
	createPlace(point) {
		const {_places} = this;
		this.historySnapshot();
		const place = _places.create({
			name: 'Place '+(++this.placeNum),
			display: 'hidden',
			position: point.clone().add(new Vector3(0, 0.1, 0)),
			scale: new Vector3(3, 1, 2)
		});
		this.select(place);
	}
	deletePlace(place) {
		const {_places} = this;
		this.historySnapshot();
		this.select();
		_places.remove(place);
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
		guiControl.addEventListener('change', this.handleControlChange);
		keyHandler.addEventListener('keydown', this.handleKeyDown);
	}
	selectedGetProp(prop, defVal) {
		const place = this.getSelected();
		if(place === undefined) return defVal;
		const prevVal = place.placeGui.get(prop);
		return place.placeGui.get(prop);
	}
	selectedSetProp(prop, nextVal, defVal) {
		const place = this.getSelected();
		if(place === undefined) return defVal;
		this.historySnapshot();
		place.placeGui.set(prop, nextVal);
		this.dispatchEvent('propchange', place, prop,  nextVal);
		return nextVal;
	}
	indentMenu(menu, indent = '\u2003\u2002') {
		const indented = {};
		for(var key in menu) {
			indented[indent+key] = menu[key];
			if(menu[key].children)
				indented[indent+key].children =
					this.indentMenu(menu[key].children, '');
		}
		return indented;
	}
	addMenu(name, menu) {
		const {_menus} = this;
		this.removeMenu(name);
		_menus.push({name, open: false, menu: this.indentMenu(menu)});
		this.refreshMenu();
	}
	removeMenu(name) {
		const {_menus} = this;
		const menuIdx = _menus.findIndex(({name: menuName}) => menuName === name);
		if(menuIdx !== -1) {
			_menus.splice(menuIdx, 1);
			this.refreshMenu();
		}
		return this;
	}
	refreshMenu() {
		//console.info('Gui.refreshMenu();');
		const {_menus, _menuState} = this;
		const menuProps = {};
		_menus.forEach(({name, menu}) => {
			const open = _menuState[name];
			const menuName = (open?'\u25BC':'\u25B6')+'\u2002'+name;
			menuProps[menuName] = () => this.toggleMenu(name);
			if(open) Object.assign(menuProps, menu);
		});
		this.clear();
		this.setProps(menuProps);
	}
	toggleMenu(name, open) {
		//console.info('Gui.toggleMenu("%s", %s);', name, open);
		const {_menus, _menuState} = this;
		_menuState[name] = (open !== undefined)?open:!_menuState[name];
		this.refreshMenu();
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
		//console.info('Gui.refresh();');
		if(dat === undefined) dat = this._dat;
		Object.keys(dat.__folders).forEach(key => this.refresh(dat.__folders[key]));
		dat.__controllers.forEach(ctrl => ctrl.setValue(ctrl.object[ctrl.property]));
	}
	getPropName(parent, prop) {
		const sanitize = (name) => name.toLowerCase()
			.replace(/[^a-z0-9\.\-\_ ]+/ig, '');
		const name = (parent?sanitize(parent)+'.':'')+sanitize(prop);
		return name;
	}
	createGuiProperties(props) {
		const createGetterSetter = (propName, defVal) => ({
			get: () => this.selectedGetProp(propName, defVal),
			set: (val) => this.selectedSetProp(propName, val, defVal),
		});
		const createProps = (props, parent) => {
			const propsDefined = {};
			Object.keys(props).forEach(key => {
				const propName = this.getPropName(parent, key);
				switch(typeof props[key]) {
					case 'object':
						if(Array.isArray(props[key])) {
							propsDefined[key] = createGetterSetter(propName, props[key]);
							break;
						}
						propsDefined[key] = {value: createProps(props[key].children, propName)};
						break;
					case 'function': propsDefined[key] = {value: props[key]}; break;
					default: propsDefined[key] = createGetterSetter(propName, props[key]);
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
			return gui.add(vals, key);
		});
	}
	setProps(props) {
		const guiProps = this.createGuiProperties(props);
		this.createGui(this._dat, props, guiProps);
	}
	inspect(entity) {
		if(entity === undefined || !entity.hasAllComponents([Transform, PlaceData, PlaceView])) {
			this.removeMenu('PLACE');
			return;
		}
		const {placeData: {name: placeName}} = entity;
		//console.info('Gui.inspect(Place(%s);', placeName);
		const {_places, _cards} = this;
		const addCard = () => {
			const selected = this.getSelected();
			if(!selected) return;
			const {transform, placeData, placeView} = selected;
			placeData.cards.push(_cards.create({position: transform.position}));
			this.refresh();
			placeView.arrangeCards();
		};
		const removeCard = () => {
			const selected = this.getSelected();
			if(!selected) return;
			const {transform, placeData, placeView} = selected;
			const removed = placeData.cards.pop();
			if(removed) removed.destroy();
			this.refresh();
			placeView.arrangeCards();
		};
		const placesInspector = {
			Name: 'n/a',
			Display: Object.keys(placeDisplayFunctions),//['hidden', 'stack', 'grid', 'fan'],
			Capacity: 0,
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
				open: false,
				children: {
					Amount: 0,
					'Add Card': addCard,
					'Remove Card': removeCard,
				}
			}
		};
		const transitionFunctions = {
			none: () => { console.log('No transition'); },
			draw: () => { console.log('"draw" transition'); },
			deploy: () => { console.log('"deploy" transition'); },
			destroy: () => { console.log('"destroy" transition'); },
			withdraw: () => { console.log('"withdraw" transition'); },
			recall: () => { console.log('"recall" transition'); },
			discharge: () => { console.log('"discharge" transition'); },
			disband: () => { console.log('"disband" transition'); },
			defect: () => { console.log('"defect" transition'); },
			desert: () => { console.log('"desert" transition'); },
		};
		const transitions = {};
		_places.getEntities().forEach(({placeData: {name}}) => {
			if(name !== placeName) transitions[name] = Object.keys(transitionFunctions);
		});
		Object.assign(placesInspector, {
			Transitions: {
				open: true,
				children: transitions
			}
		});
		this.addMenu('PLACE', placesInspector);
		//this.toggleMenu('PLACE', true);
		this.refresh();
	}
	select(target) {
		return this.getManager().selected.select(target);
	}
	getSelected() {
		return this.getManager().selected._selected;
	}
}

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		KeyHandler,
		GuiControl,
		Gui,
	};
	module.exports.ecsGui = module.exports;
}
})();