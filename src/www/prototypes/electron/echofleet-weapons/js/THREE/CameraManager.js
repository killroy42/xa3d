(function () {
	var THREE = require('THREE');

	function CameraManager(camera) {
		this.camera = camera;
		this.locations = {};
		this.tweenPosition = undefined;
		this.tweenTarget = undefined;
	}
	CameraManager.prototype = Object.create(null);
	CameraManager.prototype.constructor = CameraManager;
	CameraManager.TARGET_DISTANCE = 1000;
	CameraManager.DURATION = 0.7;
	CameraManager.prototype.add = function(label, location) {
		//console.info('CameraManager.add("%s", location);', label, location);
		if(location instanceof THREE.Object3D) location = location.matrix.clone();
		if(location instanceof THREE.Vector3 && arguments.length === 3) {
			location = this.makeLocationMatrix(arguments[1], arguments[2]);
		}
		if(!(location instanceof THREE.Matrix4)) throw new Error('Invalid location type');
		this.locations[label] = location;
	};
	CameraManager.prototype.makeLocationMatrix = function(position, target) {
		return new THREE.Matrix4()
			.setPosition(position)
			.lookAt(position, target, new THREE.Vector3(0, 0, 1));
	};
	CameraManager.prototype.getPositionVector = (function() {
		var posMat = new THREE.Matrix4();
		return function(m) {
			return new THREE.Vector3(0, 0, 0)
				.applyMatrix4(posMat.identity().copyPosition(m));
		};
	})();
	CameraManager.prototype.getTargetVector = (function() {
		var rotMat = new THREE.Matrix4();
		return function(m) {
			return new THREE.Vector3(0, 0, -1 * CameraManager.TARGET_DISTANCE)
				.applyMatrix4(rotMat.identity().extractRotation(m));
		};
	})();
	CameraManager.prototype.abort = function() {
		if(this.isAnimating !== true) return;
		this.tweenTarget.kill();
		this.tweenPosition.kill();
	};
	CameraManager.prototype.animate = function(to, duration, cb) {
		//console.info('CameraManager.animate(to, cb);');
		if(this.isAnimating === true) this.abort();
		var self = this;
		var camera = this.camera;
		var locations = this.locations;
		var from = camera.matrix;
		if(typeof duration === 'function') {
			cb = duration;
			duration = CameraManager.DURATION;
		}
		if(locations[to] !== undefined) to = locations[to];
		if(!(to instanceof THREE.Matrix4)) throw new Error('Invalid animation: '+to);
		this.isAnimating = true;
		var fromPos = this.getPositionVector(from);
		var fromTar = this.getTargetVector(from).add(fromPos);
		var toPos = this.getPositionVector(to);
		var toTar = this.getTargetVector(to).add(toPos);
		this.camera.position.copy(fromPos);
		function onUpdate() {
			camera.position.copy(fromPos);
			camera.lookAt(fromTar);
			camera.updateMatrix();
		}
		function onComplete() {
			self.isAnimating = false;
			if(typeof cb === 'function') cb();
		}
		
		this.tweenTarget = TweenLite.to(fromTar, 0.7 * duration, {
			x: toTar.x, y: toTar.y, z: toTar.z,
			ease: Power2.easeOut,
			onUpdate: onUpdate,
		});
		this.tweenPosition = TweenLite.to(fromPos, duration, {
			x: toPos.x, y: toPos.y, z: toPos.z,
			ease: Power2.easeInOut,
			onUpdate: onUpdate,
			onComplete: onComplete
		});
	};

	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = {};
		module.exports.CameraManager = CameraManager;
	}
})();