// DragAndDrop
(function () {
	/* jshint validthis: true */
	'use strict';
	var THREE = require('THREE');
	const {Matrix4, EdgesGeometry, LineSegments, LineBasicMaterial} = require('THREE');
	var EventDispatcher = require('../xeno/EventDispatcher');
	var assetdata = require('assetdata');

	var snapCardPosition = assetdata.snapCardPosition;


	function DragAndDrop(opts) {
		EventDispatcher.apply(this);
		opts = opts || {};
		this.dropZ = (opts.dropZ !== undefined)?opts.dropZ:10;
		this.dragZ = (opts.dragZ !== undefined)?opts.dragZ:300;
		this.app = opts.app;
		this.wireframe = undefined;
		this.dropTarget = undefined;
	}
	DragAndDrop.prototype = Object.create(null);
	DragAndDrop.prototype.constructor = DragAndDrop;
	DragAndDrop.prototype.createWireFrame = function(mesh) {
		//var wireframe = new THREE.EdgesHelper(mesh, 0x00ff00);
		var wireframe = new LineSegments(new EdgesGeometry(mesh.geometry), new LineBasicMaterial({ color: 0x00ff00}));
		wireframe.matrix = new Matrix4();
		wireframe.matrixAutoUpdate = true;
		wireframe.updateMatrixWorld();
		wireframe.scale.set(1.5, 1.5, 1.5);
		TweenMax.to(wireframe.scale, 1,	{
			x: 1, y: 1, z: 1,
			ease: Bounce.easeOut, repeat: -1
		});
		return wireframe;
	};
	DragAndDrop.prototype.getZVector = function(e, card, destinationZ) {
		//console.info('DragAndDrop > getZVector(e, card, destinationZ);');
		var mouseHandler = this.mouseHandler;
		var camera = this.app.camera;
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
	};
	DragAndDrop.prototype.getDropTarget = function(e, card, destinationZ) {
		var target = card.position.clone();
		target.add(this.getZVector(e, card, destinationZ));
		snapCardPosition(target);
		return target;
	};
	DragAndDrop.prototype.attachToMouseHandler = function(mouseHandler) {
		var self = this;
		var dragZ = this.dragZ;
		var dropZ = this.dropZ;
		var camera = this.app.camera;
		var scene = this.app.scene;
		var wireframe;
		this.mouseHandler = mouseHandler;
		var cardEventListeners = {
			dragstart: function cardDragStart(e) {
				//console.info('DragAndDrop > dragstart');
				var liftVector = self.getZVector(e, this, dragZ);
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
				this.animateVector(liftVector);
				scene.add(wireframe);
				self.dropTarget = self.getDropTarget(e, this, dropZ);
				wireframe.position.copy(self.dropTarget);
				this.dispatchEvent('lifted');
			},
			dragfinish: function cardDragFinish(e) {
				scene.remove(wireframe);
				self.dropTarget = self.getDropTarget(e, this, dropZ);
				var dropVector = self.dropTarget.clone();
				dropVector.sub(this.position);
				this.position.copy(self.dropTarget);
				this.animateVector(dropVector);
			},
			drag: function cardDrag(e) {
				this.position.addVectors(this._dragStartPosition, e.delta);
				self.dropTarget = self.getDropTarget(e, this, dropZ);
				wireframe.position.copy(self.dropTarget);
			}
		};
		this.attachCard = function(card) {
			if(wireframe === undefined) wireframe = this.createWireFrame(card.mesh);
			card.addEventListeners(cardEventListeners);
			self.dispatchEvent('cardattached', card);
			card.detachDragAndDrop = function() {
				card.removeEventListeners(cardEventListeners);
				self.dispatchEvent('carddetached', card);
				delete card.detachDragAndDrop;
			};
		};
	};
	
	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = DragAndDrop;
	}
})();