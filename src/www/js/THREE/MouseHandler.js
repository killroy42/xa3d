/*
	TODO:
		1. Touch support
			mousedown -> touchstart
			mousedown -> touchend
			mousemove -> touchmove + e.preventDefault()
		2. Datach/AttachEvent probably not needed
*/
(function() {
	'use strict';
	var THREE = require('THREE');
	var EventDispatcher = require('../xeno/EventDispatcher');


	function MouseHandler(opts) {
		EventDispatcher.apply(this);
		var self = this;
		opts = opts || {};
		this.domElement = opts.domElement || document;
		this.camera = opts.camera;
		this.boundHandlers = {};
		this.raycaster = new THREE.Raycaster();
		this.intersection = false;
		this.attachEvent('mousemove');
		this.attachEvent('mousedown');
		this.attachEvent('mouseup');
		this.state = MouseHandler.STATE_IDLE;
		this.dragButton = MouseHandler.BUTTON_LEFT;
		this.pointerVector = new THREE.Vector2();
		//this.dragDelta = new THREE.Vector3();
		this.dragPlane = new THREE.Mesh(MouseHandler.DRAGPLANE_GEO, MouseHandler.DRAGPLANE_MAT);
		this.dragPlane.name = 'dragplane';
		this.event = undefined;
		this.showDragGrid = false;
		this.mouseV2 = new THREE.Vector2();
		this.drag = {
			button: MouseHandler.BUTTON_LEFT,
			mouseV2: new THREE.Vector2(),
			position: new THREE.Vector3(),
			delta: new THREE.Vector3(),
			event: undefined,
			intersection: undefined,
			timeoutId: undefined,
		};
		this.click = {
			ready: false,
			intersection: undefined,
			timeoutId: undefined,
		};
		this.boundDragTimeout = function() { self.dragStart(); };
		this.interactiveObjects = [];
		//if(opts.scene) this.watchChildren(opts.scene);
		this.patchObject3D();
	}
	MouseHandler.CLICK_TIMEOUT = 1500;
	MouseHandler.DRAG_TIMEOUT = 200;
	MouseHandler.STATE_IDLE = 0;
	MouseHandler.STATE_TIMEOUT = 1;
	MouseHandler.STATE_DRAGGING = 2;
	MouseHandler.BUTTON_LEFT = 0;
	MouseHandler.BUTTON_MIDDLE = 1;
	MouseHandler.BUTTON_RIGHT = 2;
	MouseHandler.DRAGPLANE_SIZE = 10000;
	MouseHandler.DRAGPLANE_GEO = new THREE.PlaneGeometry(MouseHandler.DRAGPLANE_SIZE, MouseHandler.DRAGPLANE_SIZE);
	MouseHandler.DRAGPLANE_MAT = new THREE.MeshBasicMaterial({
		//color: 0xff00ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide
		visible: false, side: THREE.DoubleSide
	});
	MouseHandler.DRAGPLANE_GRID = new THREE.GridHelper(1000, 100);
	MouseHandler.DRAGPLANE_GRID.rotateX(90*Math.PI/180);
	MouseHandler.DRAGPLANE_GRID.material.transparent = true;
	MouseHandler.DRAGPLANE_GRID.material.opacity = 0.1;
	//MouseHandler.prototype = Object.assign(Object.create(null), THREE.EventDispatcher.prototype);
	MouseHandler.prototype = Object.create(Object.prototype);
	MouseHandler.prototype.constructor = THREE.MouseHandler;

	MouseHandler.prototype.patchObject3D = function() {
		const object3d_prototype = THREE.Object3D.prototype;
		const mouseHandler = this;
		const Object3D_add = object3d_prototype.add;
		const Object3D_remove = object3d_prototype.remove;
		Object.defineProperties(object3d_prototype, {
			receiveMouseEvents: {
				get: function() {
					//console.error('GET Object3D.receiveMouseEvents: ', this.__receiveMouseEvents);
					return this.__receiveMouseEvents;
				},
				set: function(val) {
					if(val === this.__receiveMouseEvents) return val;
					//console.error('SET Object3D.receiveMouseEvents: ', val, this);
					this.__receiveMouseEvents = val;
					if(val) {
						mouseHandler.addInteractiveObject(this);
					} else {
						mouseHandler.removeInteractiveObject(this);
					}
					return val;
				},
			},
			add: {value: function(object) {
				//console.error('Object3D.add(object);');
				Object3D_add.call(this, object);
				mouseHandler.addBranch(object);
				return this;
			}},
			remove: {value:  function(object) {
				//console.error('Object3D.remove(object);', object.name);
				Object3D_remove.call(this, object);
				mouseHandler.removeBranch(object);
				return this;
			}},
		});
	};
	MouseHandler.prototype.addInteractiveObject = function(object) {
		const {interactiveObjects} = this;
		if(interactiveObjects.indexOf(object) === -1) {
			//console.warn('adding interactive object', object.name);
			interactiveObjects.push(object);
		}
	};
	MouseHandler.prototype.removeInteractiveObject = function(object) {
		const {interactiveObjects} = this;
		const index = interactiveObjects.indexOf(object);
		if(index !== -1) {
			//console.warn('removing interactive object', object.name);
			interactiveObjects.splice(index, 1);
		}
	};
	MouseHandler.prototype.addBranch = function(object) {
		const {children} = object;
		if(object.receiveMouseEvents) this.addInteractiveObject(object);
		var i = children.length; while(i--) this.addBranch(children[i]);
	};
	MouseHandler.prototype.removeBranch = function(object) {
		const {interactiveObjects} = this;
		const {children} = object;
		this.removeInteractiveObject(object);
		var i = children.length; while(i--) this.removeBranch(children[i]);
	};
	MouseHandler.prototype.add = function(object) {
		console.info('MouseHandler.add(object);', object.name, object.receiveMouseEvents);
		var interactiveObjects = this.interactiveObjects;
		if(object.receiveMouseEvents === true && interactiveObjects.indexOf(object) === -1) {
			//console.info('MouseHandler.add("%s");', object.name, object.receiveMouseEvents);
			interactiveObjects.push(object);
			this.dispatchEvent('add', object);
		}
		for(var i = 0, l = object.children.length; i < l; i++) {
			this.add(object.children[i]);
		}
		if(object.childrenReceiveMouseEvents) {
			this.watchChildren(object);
		}
	};
	MouseHandler.prototype.remove = function(object) {
		//console.error('MouseHandler.remove();');
		var interactiveObjects = this.interactiveObjects;
		//interactiveObjects.push(object);
		var index = interactiveObjects.indexOf(object);
		if(index === -1) return;
		interactiveObjects.splice(index, 1);
		for(var i = 0, l = object.children.length; i < l; i++) {
			this.remove(object.children[i]);
		}
	};
	MouseHandler.prototype.watchChildren = function(root) {
		console.info('MouseHandler.watchChildren("%s");', root.name);
		console.log(root);
		var self = this;
		var addFunc = root.add;
		var removeFunc = root.remove;
		//console.error('assign root.add:', root, root.add);
		root.add = function(object) {
			addFunc.call(root, object);
			self.add(object);
		};
		root.remove = function(object) {
			removeFunc.call(root, object);
			self.remove(object);
		};
	};
	MouseHandler.prototype.enableDragPlane = function(position) {
		//console.info('MouseHandler.enableDragPlane(%s);', position.toString());
		this.add(this.dragPlane);
		if(this.showDragGrid) {
			var grid = MouseHandler.DRAGPLANE_GRID;
			this.add(grid);
		}
		this.updateDragPlane(position);
	};
	MouseHandler.prototype.disableDragPlane = function() {
		this.remove(this.dragPlane);
		if(this.showDragGrid) {
			var grid = MouseHandler.DRAGPLANE_GRID;
			this.remove(grid);
		}
	};
	MouseHandler.prototype.updateDragPlane = function(position) {
		//console.info('MouseHandler.updateDragPlane(%s);', position.toString());
		this.dragPlane.position.copy(position);
		this.dragPlane.updateMatrixWorld();
		var planeIntersection = this.getIntersection(this.mouseV2, this.dragPlane);
		if(!planeIntersection) {
			throw new Error('No intersection with drag plane. (Is plane behind camera?)');
		}
		this.intersection.point.copy(planeIntersection.point);
		if(this.showDragGrid) {
			var grid = MouseHandler.DRAGPLANE_GRID;
			grid.position.copy(position);
		}
		this.triggerEvent('updatedragplane', null, {intersection: planeIntersection});
	};
	MouseHandler.prototype.updateDrag = function() {
		var drag = this.drag;
		var start = this.getIntersection(drag.mouseV2, this.dragPlane);
		if(start !== false) drag.position = start.point;
		var now = this.getIntersection(this.mouseV2, this.dragPlane);
		if(now !== false) drag.delta.subVectors(now.point, drag.position);
		return drag;
	};
	MouseHandler.prototype.dragPrepare = function(e) {
		if(this.state !== MouseHandler.STATE_IDLE) return;
		if(this.intersection === false) return;
		if(this.intersection.object.draggable !== true) return;
		if(e.button !== this.drag.button) return;
		//console.info('MouseHandler.dragPrepare(e);');
		//console.log(this.intersection.object);
		this.state = MouseHandler.STATE_TIMEOUT;
		var drag = this.drag;
		drag.event = e;
		drag.mouseV2 = this.mouseV2.clone();
		drag.intersection = this.intersection;
		drag.timeoutId = setTimeout(this.boundDragTimeout, MouseHandler.DRAG_TIMEOUT);
	};
	MouseHandler.prototype.dragStart = function() {
		if(this.state !== MouseHandler.STATE_TIMEOUT) return;
		//console.info('MouseHandler.dragStart(); state: %s', this.state);
		this.state = MouseHandler.STATE_DRAGGING;
		clearTimeout(this.drag.timeoutId);
		var drag = this.drag;
		drag.delta.set(0, 0, 0);
		this.enableDragPlane(drag.intersection.point);
		this.triggerEvent('dragstart', drag.event, {
			intersection: drag.intersection,
			delta: drag.delta
		});
	};
	MouseHandler.prototype.dragMove = function(e) {
		if(this.state === MouseHandler.STATE_TIMEOUT) this.boundDragTimeout();
		if(this.state !== MouseHandler.STATE_DRAGGING) return;
		//console.info('MouseHandler.dragMove(e); state: %s', this.state);
		var drag = this.updateDrag();
		this.triggerEvent('drag', e, {
			start: drag.position,
			delta: drag.delta,
			intersection: drag.intersection
		});
	};
	MouseHandler.prototype.dragFinish = function(e) {
		if(this.state === MouseHandler.STATE_IDLE) return;
		if(this.state === MouseHandler.STATE_TIMEOUT) return this.dragAbort();
		if(this.state !== MouseHandler.STATE_DRAGGING) return;
		//console.info('MouseHandler.dragFinish(e); state: %s', this.state);
		this.dragAbort();
		var drag = this.updateDrag();
		this.triggerEvent('dragfinish', e, {
			start: drag.position,
			delta: drag.delta,
			intersection: drag.intersection
		});
	};
	MouseHandler.prototype.dragAbort = function() {
		if(this.state === MouseHandler.STATE_IDLE) return;
		//console.info('MouseHandler.dragAbort();');
		this.state = MouseHandler.STATE_IDLE;
		this.disableDragPlane();
		clearTimeout(this.drag.timeoutId);
	};
	MouseHandler.prototype.attachEvent = function(eventName) {
		if(this.boundHandlers[eventName] === undefined) {
			var self = this;
			var handlerName = eventName+'Handler';
			if(typeof this[handlerName] !== 'function') throw new Error('No handler found for '+eventName);
			this.boundHandlers[eventName] = function(e) { return self[handlerName](e); };
		}
		this.domElement.addEventListener(eventName, this.boundHandlers[eventName]);
	};
	MouseHandler.prototype.detachEvent = function(eventName) {
		if(this.boundHandlers[eventName] !== undefined) {
			this.domElement.removeEventListener(eventName, this.boundHandlers[eventName]);
		}
	};
	MouseHandler.prototype.getIntersection = function(mouseV2, objects) {
		var x = (mouseV2.x !== undefined)?mouseV2.x:mouseV2.clientX;
		var y = (mouseV2.y !== undefined)?mouseV2.y:mouseV2.clientY;
		var pointerVector = this.pointerVector;
		var raycaster = this.raycaster;
		var rect = this.domElement.getBoundingClientRect();
		var normalizedX = (x - rect.left) / rect.width;
		var normalizedY = (y - rect.top) / rect.height;
		if(objects === undefined) objects = this.interactiveObjects;
		if(Array.isArray(objects) === false) objects = [objects];
		pointerVector.set(normalizedX * 2 - 1, -normalizedY * 2 + 1);
		raycaster.setFromCamera(pointerVector, this.camera);
		var intersections = raycaster.intersectObjects(objects, true);
		return (intersections.length > 0) ? intersections[0] : false;
	};
	MouseHandler.prototype.triggerEvent = function(type, e, opts) {
		//console.info('MouseHandler.triggerEvent(%s, e, opts);', type, opts);
		//if(!type.match(/mouse(move|enter|leave)/)) console.info('MouseHandler.triggerEvent("%s", e, opts);', type);
		opts = opts || {};
		if(this.intersection && opts.intersection === undefined) opts.intersection = this.intersection;
		var event = this.event = {type: type};
		if(e) {
			event.button = e.button;
			event.buttons = e.buttons;
			event.clientX = e.clientX;
			event.clientY = e.clientY;
			event.originalEvent = e;
		}
		for(var key in opts) event[key] = opts[key];
		this.dispatchEvent(event);
		//if(!type.match(/mouse(move|enter|leave)/)) console.log(type, event.intersection.object.name);
		if(event.intersection) event.intersection.object.dispatchEvent(event);
	};
	MouseHandler.prototype.update = function(e) {
		if(e !== undefined && e.clientX && e.clientY) {
			if(document.pointerLockElement === null) {
				this.mouseV2.set(e.clientX, e.clientY);
			} else {
				this.mouseV2.set(this.mouseV2.x + e.movementX, this.mouseV2.y + e.movementY);
			}
		}
		var prevIntersection = this.intersection;
		var nextIntersection = this.getIntersection(this.mouseV2);
		if(prevIntersection && prevIntersection.object !== nextIntersection.object) this.triggerEvent('mouseleave', e);
		this.intersection = nextIntersection;
		if(nextIntersection && prevIntersection.object !== nextIntersection.object) this.triggerEvent('mouseenter', e);
	};
	MouseHandler.prototype.hasDragTarget = function(e) {
		var intersection = this.intersection;
		return (intersection !== undefined) && (intersection.object.draggable === true) && (e.button === 0);
	};
	MouseHandler.prototype.clickPrepare = function(e) {
		if(this.intersection === false) return;
		//console.info('MouseHandler.clickPrepare(e);');
		var click = this.click;
		click.intersection = this.intersection;
	};
	MouseHandler.prototype.clickFinish = function(e) {
		if(this.intersection === false) return;
		var click = this.click;
		//console.info('MouseHandler.clickFinish(e);');
		if(click.intersection.object === this.intersection.object) this.triggerEvent('click', e);
	};
	MouseHandler.prototype.mousedownHandler = function(e) {
		//console.info('MouseHandler.mousedownHandler(e);', e);
		var self = this;
		this.mousedownTime = performance.now();
		this.update(e);
		this.triggerEvent(e.type, e);
		this.dragPrepare(e);
		this.clickPrepare(e);
	};
	MouseHandler.prototype.mouseupHandler = function(e) {
		//console.info('MouseHandler.mouseupHandler(e);');
		this.update(e);
		this.triggerEvent(e.type, e);
		this.dragFinish(e);
		this.clickFinish(e);
	};
	MouseHandler.prototype.mousemoveHandler = function(e) {
		//console.info('MouseHandler.mousemoveHandler(e);');
		if(Math.abs(e.movementX + e.movementY) < 1) return;
		this.update(e);
		this.triggerEvent(e.type, e);
		this.dragMove(e);
	};


	// export in common js
	if(typeof module !== 'undefined' && ('exports' in module)){
		module.exports = MouseHandler;
	}
})();