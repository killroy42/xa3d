(function() {
	/* jshint validthis: true */
	'use strict';
	var THREE = require('THREE');


	function MouseCursor(opts) {
		opts = opts || {};
		this.scene = opts.scene;
		var self = this;
		var _mouseHandler;
		function boundUpdateCursor(e) { self.updateCursor(e); }
		this.attach = function(mouseHandler) {
			var self = this;
			_mouseHandler = mouseHandler;
			_mouseHandler.addEventListener('mousedown', boundUpdateCursor);
			_mouseHandler.addEventListener('mouseup', boundUpdateCursor);
			_mouseHandler.addEventListener('mousemove', boundUpdateCursor);
			_mouseHandler.addEventListener('updatedragplane', boundUpdateCursor);
			this.cursor = this.createCursor();
			this.scene.add(this.cursor);
			return this;
		};
		this.detach = function(mouseHandler) {
			_mouseHandler.removeEventListener('mousedown', boundUpdateCursor);
			_mouseHandler.removeEventListener('mouseup', boundUpdateCursor);
			_mouseHandler.removeEventListener('mousemove', boundUpdateCursor);
			_mouseHandler.removeEventListener('updatedragplane', boundUpdateCursor);
			return this;
		};
	}
	MouseCursor.COLOR_IDLE = 0x0000ff;
	MouseCursor.COLOR_CLICK = 0xffff00;
	MouseCursor.COLOR_DRAGGABLE = 0x00ff00;
	MouseCursor.prototype.createCursor = function() {
		var cursor = new THREE.Mesh(
			new THREE.BoxGeometry(10, 10, 10),
			new THREE.MeshBasicMaterial({color: 0xffff00})
		);
		var mouseCursorMaterial = cursor.material;
		cursor.name = 'mouseCursor';
		cursor.setColor = function(hex) {
			if(mouseCursorMaterial.color.getHex() !== hex) {
				mouseCursorMaterial.color.setHex(hex);
				mouseCursorMaterial.needsUpdate = true;
			}
		};
		return cursor;
	};
	MouseCursor.prototype.updateCursor = function(e) {
		if(!e.intersection) return;
		var cursor = this.cursor;
		var color = MouseCursor.COLOR_IDLE;
		cursor.position.copy(e.intersection.point);
		if(e.delta) cursor.position.add(e.delta);
		if(e.intersection.object.draggable) {
			cursor.rotation.set(0, 0, 45 * Math.PI / 180);
			color = MouseCursor.COLOR_DRAGGABLE;
		} else {
			cursor.rotation.set(0, 0, 0);
		}
		if(e.buttons & 1) color = MouseCursor.COLOR_CLICK;
		cursor.setColor(color);
	};


	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = {};
		module.exports.MouseCursor = MouseCursor;
	}
})();