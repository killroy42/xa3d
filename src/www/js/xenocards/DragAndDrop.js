// DragAndDrop
(function () {
	/* jshint validthis: true */
	'use strict';
	var THREE = require('THREE');


	function DragAndDrop(opts) {
		opts = opts || {};
		this.dropZ = (opts.dropZ !== undefined)?opts.dropZ:10;
		this.dragZ = (opts.dragZ !== undefined)?opts.dragZ:300;
		this.prototype = opts.prototype;
		this.attachToMouseHandler = function(mouseHandler) {
			this.createCardAttacher(mouseHandler);
		};
	}
	DragAndDrop.prototype.createWireFrame = function(mesh) {
		var wireframe = new THREE.EdgesHelper(mesh, 0x00ff00);
		wireframe.matrix = new THREE.Matrix4();
		wireframe.matrixAutoUpdate = true;
		wireframe.updateMatrixWorld();
		wireframe.scale.set(1.5, 1.5, 1.5);
		TweenMax.to(wireframe.scale, 1,	{
			x: 1, y: 1, z: 1,
			ease: Bounce.easeOut, repeat: -1
		});
		return wireframe;
	};
	DragAndDrop.prototype.snapDropPosition = function(position) {
	};
	DragAndDrop.prototype.createCardAttacher = function(mouseHandler) {
		var self = this;
		var dragZ = this.dragZ;
		var dropZ = this.dropZ;
		var camera = this.prototype.camera;
		var scene = this.prototype.scene;
		var wireframe;
		function getZVector(e, card, destinationZ) {
			//console.info('DragAndDrop > getZVector(e, card, destinationZ);');
			var zVector = new THREE.Vector3();
			var dragIntersection = mouseHandler.getIntersection(e, mouseHandler.dragPlane);
			var start = camera.position;
			var end = dragIntersection.point;
			if(dragIntersection === false) return zVector;
			zVector.subVectors(end, start);
			var deltaZ = destinationZ - card.position.z;
			var scale = deltaZ / zVector.z;
			zVector.multiplyScalar(scale);
			return zVector;
		}
		function getDropTarget(e, card, destinationZ) {
			var target = card.position.clone();
			target.add(getZVector(e, card, destinationZ));
			self.snapDropPosition(target);
			return target;
		}
		function cardDragStart(e) {
			wireframe.position.copy(this.position);
			var liftVector = getZVector(e, this, dragZ);
			this.position.add(liftVector);
			try {
				mouseHandler.updateDragPlane(this.position);
			} catch(err) {
				console.warn(err.message);
				this.position.sub(liftVector);
				mouseHandler.abortDrag(e);
				return;
			}
			this._dragStartPosition = this.position.clone();
			//var mesh = this.mesh;
			//mesh.position.sub(liftVector);
			//animatePosition(mesh.position, liftVector);
			this.animateMesh(liftVector);
			scene.add(wireframe);
		}
		function cardDragFinish(e) {
			//console.info('DragAndDrop > cardDragFinish(e);');
			scene.remove(wireframe);
			var target = getDropTarget(e, this, dropZ);
			var dropVector = target.clone();
			dropVector.sub(this.position);
			this.position.copy(target);
			//var mesh = this.mesh;
			//mesh.position.sub(dropVector);
			//animatePosition(mesh.position, dropVector);
			this.animateMesh(dropVector);
		}
		function cardDrag(e) {
			//console.log('DragAndDrop > cardDrag(e);');
			//console.log(this._dragStartPosition.toString());
			//console.log(e.delta.toString());
			this.position.addVectors(this._dragStartPosition, e.delta);
			var target = getDropTarget(e, this, dropZ);
			wireframe.position.copy(target);
		}
		this.attachCard = function(card) {
			if(wireframe === undefined) wireframe = this.createWireFrame(card.mesh);
			card.addEventListener('dragstart', cardDragStart);
			card.addEventListener('drag', cardDrag);
			card.addEventListener('dragfinish', cardDragFinish);
			card.detachDragAndDrop = function() {
				card.removeEventListener('dragstart', cardDragStart);
				card.removeEventListener('drag', cardDrag);
				card.removeEventListener('dragfinish', cardDragFinish);
				delete card.detachDragAndDrop;
			};
		};
	};
	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = DragAndDrop;
	}
})();