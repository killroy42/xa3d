(function() {
	'use strict';
	var NetObject = require('NetObject');


	function getNetPointerClientProxyType(scene, mouseHandler) {
		/* jshint validthis: true */
		
		function NetPointerClientProxy() {
			NetObject.apply(this, arguments);
			var self = this;
			var client = self.owner;
			this.typeName = 'NetPointer';
		}
		NetPointerClientProxy.prototype = Object.create(NetObject.prototype);
		NetPointerClientProxy.prototype.constructor = NetPointerClientProxy;
		NetPointerClientProxy.prototype.onCreateclient = function() {
			var self = this;
			this.baseColor = 0x00ff00;
			this.mesh = new THREE.Mesh(
				new THREE.CubeGeometry(60, 60, 60),
				new THREE.MeshPhongMaterial({color: this.baseColor, transparent: true, opacity: 0.6})
			);
			this.mesh.rotation.set(45 * Math.PI / 180, 45 * Math.PI / 180, 0);
			scene.add(this.mesh);
			function handleMouseEvent(e) {
				var event = {type: e.type};
				if(e.intersection) event.position = e.intersection.point;
				self.sendEvent(event);
			}
			mouseHandler.addEventListener('mousedown', handleMouseEvent);
			mouseHandler.addEventListener('mouseup', handleMouseEvent);
			mouseHandler.addEventListener('mousemove', handleMouseEvent);
		};
		NetPointerClientProxy.prototype.onCreateproxy = function() {
			this.baseColor = 0xff00ff;
			this.mesh = new THREE.Mesh(
				new THREE.CubeGeometry(60, 60, 60),
				new THREE.MeshPhongMaterial({color: this.baseColor, transparent: true, opacity: 0.3})
			);
			scene.add(this.mesh);
		};
		NetPointerClientProxy.prototype.onEvent = function(e) {
			var self = this;
			var meshColor = this.mesh.material.color;
			switch(e.type) {
				case 'mousedown': meshColor.set(0xff0000); break;
				case 'mouseup': meshColor.set(this.baseColor); break;
				case 'mousemove': if(e.position) this.mesh.position.copy(e.position); break;
			}
		};
		
		return NetPointerClientProxy;
	}


	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = getNetPointerClientProxyType;
	}
})();