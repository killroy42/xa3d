(function() {
'use strict';
var THREE = require('THREE');
var Network = require('Network');

var PeerType = Network.PeerType;


var blueprint = {
	name: 'CardBlueprint',
	createCard: function() {
		var scene = this.context.scene;
		var xenoCard3D = this.context.xenoCard3D;
		var texture = this.context.loadTexture(this.state.portrait);
		var card = xenoCard3D.createCard(texture);
		this.mesh = card;
		scene.add(card);
		return card;
	},
	OnCreateClient: function() {
		var self = this;
		var scene = this.context.scene;
		var card = this.createCard();
		card.addEventListener('dragstart', function(e) {
			this._dragStartPosition = this.position.clone();
		});
		card.addEventListener('drag', function(e) {
			this.position.copy(this._dragStartPosition.clone().add(e.delta));
			self.updateState();
		});
	},
	OnCreateProxy: function() {
		var card = this.createCard();
	},
	OnDestroy: function() {
		if(this.peerType === PeerType.PROXY) {
			this.context.scene.remove(this.mesh);
		}
	},
	OnSerialize: function(state) {
		//console.info('BoxBlueprint.OnSerialize(%s);', JSON.stringify(state));
		var serialized = {
			//color: this.mesh.material.color.getHex(),
			portrait: this.state.portrait,
			position: this.mesh.position,
		};
		return serialized;
	},
	OnDeserialize: function(state) {
		//console.info('BoxBlueprint.OnDeserialize(%s);', JSON.stringify(state));
		//this.mesh.material.color.set(state.color);
		this.mesh.position.copy(state.position);
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();