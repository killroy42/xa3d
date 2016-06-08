(function() {
'use strict';
var THREE = require('THREE');
var Network = require('../Network');

var PeerType = Network.PeerType;


var blueprint = {
	name: 'BoxBlueprint',
	createBox: function() {
		var box = new THREE.Mesh(
			new THREE.CubeGeometry(100, 100, 100),
			new THREE.MeshPhongMaterial({color: 0xffffff})
		);
		return box;
	},
	OnCreateClient: function() {
		var self = this;
		var box = this.createBox();
		box.scale.set(1, 1, 0.1);
		box.receiveMouseEvents = true;
		box.draggable = true;
		box.addEventListener('dragstart', function(e) {
			this._dragStartPosition = this.position.clone();
		});
		box.addEventListener('drag', function(e) {
			this.position.copy(this._dragStartPosition.clone().add(e.delta));
			self.updateState();
		});
		this.mesh = box;
		this.context.scene.add(box);
	},
	OnCreateProxy: function() {
		var box = this.createBox();
		box.scale.set(0.4, 0.4, 1);
		box.receiveMouseEvents = true;
		this.mesh = box;
		this.context.scene.add(box);
	},
	OnDestroy: function() {
		//console.info('BoxBlueprint.OnDestroy();');
		var scene = this.context.scene;
		if(this.peerType === PeerType.PROXY) {
			scene.remove(this.mesh);
		}
	},
	OnSerialize: function(state) {
		//console.info('BoxBlueprint.OnSerialize(%s);', JSON.stringify(state));
		var serialized = {
			color: this.mesh.material.color.getHex(),
			position: this.mesh.position,
			velocity: state.velocity
		};
		return serialized;
	},
	OnDeserialize: function(state) {
		//console.info('BoxBlueprint.OnDeserialize(%s);', JSON.stringify(state));
		this.mesh.material.color.set(state.color);
		this.mesh.position.copy(state.position);
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();