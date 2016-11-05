(function() {
'use strict';
var Network = require('../Network');

var PeerType = Network.PeerType;


var blueprint = {
	name: 'GameBlueprint',
	createCard: function(portrait, position) {
		//console.info('GameBlueprint.client.createCard(%s, %s);', portrait, JSON.stringify(position));
		var netId = this.netId;
		var cards = this.cards;
		var scene = this.context.scene;
		var xenoCard3D = this.context.xenoCard3D;
		var texture = this.context.loadTexture(portrait);
		var card = xenoCard3D.createCard(texture);
		card.isDragging = false;
		card.position.copy(position);
		this.mesh = card;
		scene.add(card);
		return card;
	},
	OnCreateProxy: function() {
		console.info('GameBlueprint.client.OnCreateProxy();');
		this.context.game = this;
		this.cards = [];
	}, 
	OnDestroy: function() {
		console.info('GameBlueprint.client.OnDestroy();');
	},
	OnDeserialize: function(state) {
		//console.info('GameBlueprint.client.OnDeserialize(%s);', JSON.stringify(state));
		var self = this;
		this.state.cards.forEach(function(cardState, idx) {
			var card = self.cards[idx];
			if(card === undefined) {
				//console.log('NEW CARD:', cardState);
				self.cards[idx] = self.createCard(cardState.portrait, cardState.position);
				self.cards[idx].cardId = idx;
			} else {
				if(card.isDragging !== true) {
					//console.log('UPDATE card', card.isDragging);
					//console.log('DRAG: %s => %s', JSON.stringify(card.position), JSON.stringify(cardState.position));
					card.position.copy(cardState.position);
				}
			}
		});
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();