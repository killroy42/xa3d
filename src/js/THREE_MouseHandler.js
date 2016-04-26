 (function() {
'use strict';

var THREE = require('THREE');

	/*
		TODO:
			1. Touch support
				mousedown -> touchstart
				mousedown -> touchend
				mousemove -> touchmove + e.preventDefault()
			2. Datach/AttachEvent probably not needed
	*/

function MouseDrag(mouseHandler) {
	this.mouseHandler = mouseHandler;
	this.state = MouseDrag.STATE_IDLE;
	this.dragDelta = new THREE.Vector3();
	this.dragTimeout;
	this.startEvent;
	var self = this;
	this.boundHandleTimeout = function() { self.start(self.startEvent); };
	this.boundHandleMousedown = function(e) { self.handleMousedown(e); };
	this.boundHandleMouseup = function(e) { self.handleMouseup(e); };
	this.boundHandleMousemove = function(e) { self.handleMousemove(e); };
	mouseHandler.addEventListener('mousedown', this.boundHandleMousedown);
}
MouseDrag.TIMEOUT = 1000;
MouseDrag.STATE_IDLE = 0;
MouseDrag.STATE_WAIT = 1;
MouseDrag.STATE_DRAGGING = 2;
MouseDrag.prototype.start = function(e) {
	console.info('MouseDrag.start(e);');
	if(this.state !== MouseDrag.STATE_WAIT) throw new Error('Invalid state ['+this.state+'] for MouseDrag.start(e)');
	this.state = MouseDrag.STATE_DRAGGING;
	clearTimeout(this.dragTimeoutId);
	this.dragTimeoutId = undefined;
	var mouseHandler = this.mouseHandler;
	mouseHandler.enableDragPlane(e.intersection.point);
	this.dragDelta.set(0, 0, 0);
	mouseHandler.triggerEvent('dragstart', e, {delta: this.dragDelta});
	this.startIntersection = mouseHandler.getIntersection({x: e.clientX, y: e.clientY}, mouseHandler.dragPlane);
	console.log('startEvent:', this.startEvent.intersection.point.toString());
	console.log('startIntersection:', this.startIntersection.point.toString());
};
MouseDrag.prototype.finish = function(e) {
	console.info('MouseDrag.finish(e: %s);', e.type);
	if(this.state !== MouseDrag.STATE_DRAGGING) throw new Error('Invalid state ['+this.state+'] for MouseDrag.finish(e)');
	this.state = MouseDrag.STATE_IDLE;
	var mouseHandler = this.mouseHandler;
	mouseHandler.disableDragPlane();
	mouseHandler.addEventListener('mousedown', this.boundHandleMousedown);
	mouseHandler.removeEventListener('mouseup', this.boundHandleMouseup);
	mouseHandler.removeEventListener('mousemove', this.boundHandleMousemove);
	mouseHandler.triggerEvent('dragend', e, {delta: this.dragDelta});
};
MouseDrag.prototype.drag = function(e) {
	console.info('MouseDrag.drag(e: %s);', e.type);
	if(this.state !== MouseDrag.STATE_DRAGGING) throw new Error('Invalid state ['+this.state+'] for MouseDrag.drag(e)');
	var mouseHandler = this.mouseHandler;
	var startIntersection = this.startIntersection;
	var dragIntersection = this.mouseHandler.intersection;
	console.log('startEvent:', this.startEvent.intersection.point.toString());
	console.log('dragIntersection:', dragIntersection.point.toString());
	if(dragIntersection) {
		this.dragDelta.subVectors(dragIntersection.point, startIntersection.point);
		console.log('dragDelta:', this.dragDelta.toString());
		mouseHandler.triggerEvent('drag', e, {intersection: this.startEvent.intersection, delta: this.dragDelta});
	}
};
MouseDrag.prototype.cancel = function(e) {
	console.info('MouseDrag.cancel(e);');
	if(this.state !== MouseDrag.STATE_WAIT) return;
	this.state = MouseDrag.STATE_IDLE;
	clearTimeout(this.dragTimeoutId);
	this.dragTimeoutId = undefined;
	var mouseHandler = this.mouseHandler;
	mouseHandler.addEventListener('mousedown', this.boundHandleMousedown);
	mouseHandler.removeEventListener('mouseup', this.boundHandleMouseup);
	mouseHandler.removeEventListener('mousemove', this.boundHandleMousemove);
};
MouseDrag.prototype.handleMousedown = function(e) {
	console.info('MouseDrag.handleMousedown(e);', this.state);
	if(this.state !== MouseDrag.STATE_IDLE) return;
	console.log(e.intersection.object.name);
	console.log(e.intersection.object.draggable);
	if(e.intersection.object.draggable !== true) return;
	
	console.log('Valid draggable');
	var mouseHandler = this.mouseHandler;
	mouseHandler.removeEventListener('mousedown', this.boundHandleMousedown);
	mouseHandler.addEventListener('mouseup', this.boundHandleMouseup);
	mouseHandler.addEventListener('mousemove', this.boundHandleMousemove);
	this.startEvent = e;
	this.state = MouseDrag.STATE_WAIT;
	this.dragTimeoutId = setTimeout(this.boundHandleTimeout, MouseDrag.TIMEOUT);
	
	/*
	var self = this;
	this.intersection = intersection;
	switch(this.state) {
		case MouseDrag.STATE_NONE:
			this.startEvent = e;
			this.state = MouseDrag.STATE_WAIT;
			this.dragTimeout = setTimeout(this.timeoutHandler, MouseDrag.TIMEOUT);
			break;
		default: throw new Error('Invalid ['+e.type+'] event during state ['+this.state+']');
	}
	*/
};
MouseDrag.prototype.handleMouseup = function(e) {
	console.info('MouseDrag.handleMouseup(e);');
	switch(this.state) {
		case MouseDrag.STATE_NONE: break;
		case MouseDrag.STATE_WAIT: this.cancel(e); break;
		case MouseDrag.STATE_DRAGGING: this.finish(e); break;
		default: throw new Error('Invalid ['+e.type+'] event during state ['+this.state+']');
	}
};
MouseDrag.prototype.handleMousemove = function(e) {
	//console.info('MouseDrag.handleMousemove(e);');
	switch(this.state) {
		case MouseDrag.STATE_IDLE: break;
		case MouseDrag.STATE_WAIT: this.start(this.startEvent); this.drag(e); break;
		case MouseDrag.STATE_DRAGGING: this.drag(e); break;
		default: throw new Error('Invalid ['+e.type+'] event during state ['+this.state+']');
	}
};


function MouseHandler(domElement, camera) {
	THREE.Object3D.call(this);
	var self = this;
	this.domElement = domElement || document;
	this.camera = camera;
	this.boundHandlers = {};
	this.raycaster = new THREE.Raycaster();
	this.intersection = false;
	this.attachEvent('mousemove');
	this.attachEvent('mousedown');
	this.attachEvent('mouseup');
	this.dragging = false;
	this.dragState = MouseHandler.DRAG_STATE_NONE;
	this.pointerVector = new THREE.Vector2();
	this.dragVector = new THREE.Vector3();
	this.dragPlane = new THREE.Mesh(MouseHandler.DRAGPLANE_GEO, MouseHandler.DRAGPLANE_MAT);
	this.dragPlane.name = 'dragplane';
	this.event = undefined;
	this.showDragGrid = true;
	this.mousePos = new THREE.Vector2();
	var mouseDrag = this.mouseDrag = new MouseDrag(this);
	//mouseDrag.onStart = function(e) { self.startDragging(e); };
	//mouseDrag.onFinish = function(e) { self.finishDragging(e); };
	//mouseDrag.onDrag = function(e) { self.updateDragging(e); };
}
MouseHandler.CLICK_TIMEOUT = 500;
MouseHandler.DRAG_STATE_NONE = 0;
MouseHandler.DRAG_STATE_WAIT = 1;
MouseHandler.DRAG_STATE_DRAGGING = 2;
MouseHandler.DRAGPLANE_SIZE = 10000;
MouseHandler.DRAGPLANE_GEO = new THREE.PlaneGeometry(MouseHandler.DRAGPLANE_SIZE, MouseHandler.DRAGPLANE_SIZE);
MouseHandler.DRAGPLANE_MAT = new THREE.MeshBasicMaterial({
	color: 0xff0000, transparent: true, opacity: 0.1, side: THREE.DoubleSide
	//visible: false, side: THREE.DoubleSide
});
MouseHandler.DRAGPLANE_GRID = new THREE.GridHelper(1000, 100);
MouseHandler.DRAGPLANE_GRID.rotateX(90*Math.PI/180);
MouseHandler.DRAGPLANE_GRID.material.transparent = true;
MouseHandler.DRAGPLANE_GRID.material.opacity = 0.1;
MouseHandler.prototype = Object.create(THREE.Object3D.prototype);
MouseHandler.prototype.constructor = THREE.MouseHandler;
THREE.EventDispatcher.prototype.apply(MouseHandler.prototype);
MouseHandler.prototype.updateDragPlane = function(position) {
	console.info('MouseHandler.updateDragPlane(%s);', position.toString());
	this.dragPlane.position.copy(position);
	this.dragPlane.updateMatrixWorld();
	var planeIntersection = this.getIntersection(this.mousePos, this.dragPlane);
	if(!planeIntersection) {
		throw new Error('No intersection with drag plane. (Is plane behind camera?)');
	}
	this.intersection.point.copy(planeIntersection.point);
	if(this.showDragGrid) {
		var grid = MouseHandler.DRAGPLANE_GRID;
		grid.position.copy(position);
	}
	this.dragVector.set(0, 0, 0);
};
MouseHandler.prototype.updateDragDelta = function(e) {
	var dragStartIntersection = this.mouseDrag.intersection;
	var dragIntersection = this.intersection; // this.getIntersection({x: e.clientX, y: e.clientY}, this.dragPlane);
	if(dragIntersection) {
		console.log(
			'  updateDragDelta:',
			dragStartIntersection.point.toString(),
			dragIntersection.point.toString()
		);
		this.dragVector.subVectors(dragIntersection.point, dragStartIntersection.point);
	}
};
MouseHandler.prototype.enableDragPlane = function(position) {
	this.add(this.dragPlane);
	this.dragPlane.position.copy(position);
	this.dragPlane.updateMatrixWorld();
	if(this.showDragGrid) {
		var grid = MouseHandler.DRAGPLANE_GRID;
		this.add(grid);
		grid.position.copy(position);
	}
};
MouseHandler.prototype.disableDragPlane = function() {
	this.remove(this.dragPlane);
	if(this.showDragGrid) {
		var grid = MouseHandler.DRAGPLANE_GRID;
		this.remove(grid);
	}
}; 
MouseHandler.prototype.startDragging = function(e) {
	var dragIntersection = this.mouseDrag.intersection;
	this.enableDragPlane(dragIntersection.point);
	this.dragVector.set(0, 0, 0);
	this.triggerEvent('dragstart', e, {delta: this.dragVector});
};
MouseHandler.prototype.finishDragging = function(e) {
	this.updateDragDelta(e);
	this.disableDragPlane();
	this.triggerEvent('dragend', e, {delta: this.dragVector});
};
MouseHandler.prototype.updateDragging = function(e) {
	//console.info('MouseHandler.updateDragging(e);');
	this.updateDragDelta(e);
	var dragDelta = this.dragVector.subVectors(
		this.intersection.point,
		this.mouseDrag.intersection.point
	);
	this.triggerEvent('drag', e, {delta: dragDelta});
};
MouseHandler.prototype.dragStart = function(e) {
	var intersection = this.intersection;
	if(!this.dragging && intersection && intersection.object.draggable && e.button === 0) {
		this.dragging = true;
		this.startDragging(e);
	}
};
MouseHandler.prototype.dragEnd = function(e) {
	if(this.dragging && e.button === 0) {
		this.dragging = false;
		this.finishDragging(e);
	}
};
MouseHandler.prototype.drag = function(e) {
	if(this.dragging) {
		this.updateDragging(e);
	}
};
MouseHandler.prototype.abortDrag = function(e) {
	if(this.dragging) {
		this.dragVector.set(0, 0, 0);
		this.dragging = false;
		this.disableDragPlane();
		this.triggerEvent('dragend', e, {delta: this.dragVector});
	}
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
MouseHandler.prototype.getIntersect = function(mousePos, object) {
	console.warn('DEPRECATED: MouseHandler.getIntersect use MouseHandler.getIntersection() instead.');
	return this.getIntersection(mousePos, object);
};
MouseHandler.prototype.getIntersection = function(mousePos, object) {
	var x = mousePos.x, y = mousePos.y;
	if((x === undefined) && (y === undefined) &&
		 (mousePos.clientX !== undefined) && (mousePos.clientY !== undefined)) {
		x = mousePos.clientX;
		y = mousePos.clientY;
	}
	var pointerVector = this.pointerVector;
	var raycaster = this.raycaster;
	var rect = this.domElement.getBoundingClientRect();
	var normalizedX = (x - rect.left) / rect.width;
	var normalizedY = (y - rect.top) / rect.height;
	pointerVector.set(normalizedX * 2 - 1, -normalizedY * 2 + 1);
	raycaster.setFromCamera(pointerVector, this.camera);
	var intersections = raycaster.intersectObject(object, true);
	return (intersections.length > 0) ? intersections[0] : false;
};
MouseHandler.prototype.triggerEvent = function(type, e, opts) {
	var opts = opts || {};
	if(this.intersection && opts.intersection === undefined) opts.intersection = this.intersection;
	var event = this.event = {type: type};
	if(e) {
		event.button = e.button;
		event.buttons = e.buttons;
		event.clientX = e.clientX;
		event.clientY = e.clientY;
	}
	for(var key in opts) event[key] = opts[key];
	this.dispatchEvent(event);
	if(event.intersection) event.intersection.object.dispatchEvent(event);
};
MouseHandler.prototype.update = function(e) {
	if(e !== undefined && e.clientX && e.clientY) this.mousePos.set(e.clientX, e.clientY);
	if(this.dragging) return;
	var prevIntersection = this.intersection;
	var nextIntersection = this.getIntersection(this.mousePos, this);
	if(prevIntersection && prevIntersection.object !== nextIntersection.object) this.triggerEvent('mouseleave', e);
	this.intersection = nextIntersection;
	if(nextIntersection && prevIntersection.object !== nextIntersection.object) this.triggerEvent('mouseenter', e);
};
MouseHandler.prototype.hasDragTarget = function(e) {
	var intersection = this.intersection;
	return (intersection !== undefined) && (intersection.object.draggable === true) && (e.button === 0);
};
MouseHandler.prototype.mousedownHandler = function(e) {
	var self = this;
	this.mousedownTime = performance.now();
	this.update(e);
	this.triggerEvent(e.type, e);
	//console.info('mousedown  > hasDragTarget: %s', this.hasDragTarget(e));
	//if(this.hasDragTarget(e)) this.mouseDrag.onDown(e, this.intersection);
	/*
	switch(this.dragState) {
		case MouseHandler.DRAG_STATE_NONE:
			this.dragState = MouseHandler.DRAG_STATE_WAIT;
			this.clickTimeout = setTimeout(function() {
				console.info('clickTimeout: t: %s, dragState: %s', Math.round(performance.now() - self.mousedownTime), self.dragState);
				self.dragState = MouseHandler.DRAG_STATE_DRAGGING;
				self.dragStart(e);
			}, MouseHandler.CLICK_TIMEOUT);
			break;
		default: throw new Error('Invalid ['+e.type+'] event during dragState ['+this.dragState+']');
	}
	*/
};
MouseHandler.prototype.mouseupHandler = function(e) {
	//console.info('mouseup: t: %s, dragState: %s', Math.round(performance.now() - this.mousedownTime), this.dragState);
	this.update(e);
	this.triggerEvent(e.type, e);
	//this.mouseDrag.onUp(e);
	/*
	switch(this.dragState) {
		case MouseHandler.DRAG_STATE_WAIT:
			console.log('Cancel drag');
			clearTimeout(this.clickTimeout);
			this.dragState = MouseHandler.DRAG_STATE_NONE;
			// TODO: Fire click event
			break;
		case MouseHandler.DRAG_STATE_DRAGGING:
			//console.log('mouseup => DRAG_STATE_DRAGGING');
			this.dragState = MouseHandler.DRAG_STATE_NONE;
			this.dragEnd(e);
			break;
		default: throw new Error('Invalid ['+e.type+'] event during dragState ['+this.dragState+']');
	}
	*/
};
MouseHandler.prototype.mousemoveHandler = function(e) {
	if(Math.abs(e.movementX + e.movementY) < 1) return;
	this.update(e);
	this.triggerEvent(e.type, e);
	//console.info('mousemove: t: %s, dragState: %s', Math.round(performance.now() - this.mousedownTime), this.dragState);
	//this.mouseDrag.onMove(e);
	/*
	switch(this.dragState) {
		case MouseHandler.DRAG_STATE_NONE: break;
		//case MouseHandler.DRAG_STATE_WAIT: throw new Error('Invalid ['+e.type+'] event during dragState ['+this.dragState+']');
		case MouseHandler.DRAG_STATE_DRAGGING: this.drag(e);
		default: throw new Error('Invalid ['+e.type+'] event during dragState ['+this.dragState+']');
	}
	*/
};


// export in common js
if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = MouseHandler;
}
})();