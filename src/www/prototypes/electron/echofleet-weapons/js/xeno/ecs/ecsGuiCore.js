(() => {
/* jshint validthis: true */
'use strict';

const {Entity, Component, System, EntityManager} = require('XenoECS');
const {Vector3, TransformControls, Raycaster} = require('THREE');
//const DatGui = require('dat').GUI;
const EventDispatcher = require('EventDispatcher');
const MouseCursor = require('MouseCursor');
//const {colors, dimensions} = require('assetdata');
//const {makeRoundedRectShape} = require('GeometryHelpers');
const {Transform, Collider} = require('components');
const {Selected, Selectable} = require('ecsSelectable');
//const {throttle} = require('_');

class KeyHandler extends Component {
	constructor() {
		super();
		EventDispatcher.apply(this);
		this._pressedKeys = {};
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.handleKeyUp = this.handleKeyUp.bind(this);
	}
	OnAttachComponent(entity) {
		window.addEventListener('keydown', this.handleKeyDown);
		window.addEventListener('keyup', this.handleKeyUp);
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
	isPressed(key) {
		return this._pressedKeys[key] === true;
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
		this.handleControlMousedown = this.handleControlMousedown.bind(this);
		this.handleControlMouseup = this.handleControlMouseup.bind(this);
		this.controlInUse = false;
	}
	OnAttachComponent(entity) {
		//console.info('GuiControl.OnAttachComponent(entity);');
		const {app, keyHandler} = entity;
		const handleKey = (event) => {
			MouseCursor.COLOR_IDLE = keyHandler.isPressed('Shift')?
				keyHandler.isPressed('Alt')?0xff0000:0x00ff00
				:MouseCursor._COLOR_IDLE;
			this._pointer.cursor.setColor(MouseCursor.COLOR_IDLE);
		};
		keyHandler
			.addEventListener('keydown', this.handleKey)
			.addEventListener('keyup', this.handleKey);
		entity.on('appready', (app) => {
			const {camera, renderer, pointer} = app;
			const {_entity, _pressedKeys} = this;
			const {transform} = _entity;
			const control = new TransformControls(camera, renderer.domElement);
			transform.add(control);
			control.addEventListener('mouseDown', this.handleControlMousedown);
			control.addEventListener('mouseUp', this.handleControlMouseup);
			control.addEventListener('change', this.handleChange);
			this._pointer = pointer;
			this._control = control;
			app.addRenderHandler((time) => control.update());
		});
	}
	handleKey(event) {
		const {key, repeat} = event;
		if(repeat) return;
		const keyHandler = this.getComponent(KeyHandler);
		const {_control, _pointer} = this;
		MouseCursor.COLOR_IDLE = keyHandler.isPressed('Shift')?
			keyHandler.isPressed('Alt')?0xff0000:0x00ff00
			:MouseCursor._COLOR_IDLE;
		_pointer.cursor.setColor(MouseCursor.COLOR_IDLE);
		switch(key) {
			case 'v': _control.setMode('translate'); break;
			case 's': _control.setMode('scale'); break;
			case 'r': _control.setMode('rotate'); break;
		}
	}
	handleChange(event) {
		this.dispatchEvent('change', event);
	}
	handleControlMousedown(event) {
		//console.info('handleControlMousedown');
		this.controlInUse = true;
	}
	handleControlMouseup(event) {
		//console.info('handleControlMouseup');
		this.controlInUse = false;
	}
	attach(entity) {
		if(this.controlInUse) return;
		this._control.attach(entity.transform.object3d);
	}
	detach(entity) {
		const object = entity.transform.object3d;
		if(this._control.object === object) {
			this._control.detach(entity.transform.object3d);
		}
	}
}

class ControlHandle extends Component {
	constructor() {
		super();
		this.handleMouseenter = this.handleMouseenter.bind(this);
	}
	getGuiControl() {
		return this.getManager().findComponent(GuiControl);
	}
	handleMouseenter(event) {
		const control = this.getGuiControl();
		control.attach(this.getEntity());
	}
	OnAttachComponent(entity) {
		const {object3d} = this.getComponent(Collider);
		object3d.addEventListener('mouseenter', this.handleMouseenter);
	}
	OnDetachComponent(entity) {
		//console.info('ControlHandle.OnDetachComponent(entity);');
		const {object3d} = this.getComponent(Collider);
		object3d.removeEventListener('mouseenter', this.handleMouseenter);
		const control = this.getGuiControl();
		control.detach(this.getEntity());
	}
}

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		KeyHandler,
		GuiControl,
		ControlHandle,
	};
	module.exports.ecsGuiCore = module.exports;
}
})();