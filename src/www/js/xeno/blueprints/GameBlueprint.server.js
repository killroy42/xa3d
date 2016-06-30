(function() {
'use strict';

var Network = require('../Network');
var THREE = require('../../../vendors/THREE/three_r78dev');
var enhanceTHREE = require('../../helpers/enhanceTHREE');

enhanceTHREE(THREE);

var blueprint = {
	name: 'GameBlueprint',
	createCard: function() {
		//console.info('GameBlueprint.server.createCard();');
		var snapCardPosition = this.context.assetdata.snapCardPosition;
		var cardInfo = this.context.assetdata.cardInfo;
		var x = (Math.random()*2-1)*3*cardInfo.width;
		var y = (Math.random()*2-1)*2*cardInfo.height;
		var z = cardInfo.boardZ;
		this.cards.push({
			portrait: this.context.assetdata.getRandomPortraitUrl(),
			position: snapCardPosition({x: x, y: y, z: z})
		});
		this.updateState(true);
	},
	moveCard: function(id, position) {
		console.error('GameBlueprint.server.moveCard(%s, %s);', id, JSON.stringify(position));
		if(
			position === undefined ||
			position.x === undefined ||
			position.y === undefined ||
			position.z === undefined
			) {
			console.error('GameBlueprint.server.moveCard > invalid position argument');
			return false;
		}
		var THRESHOLD = 0.001;
		var netId = this.netId;
		var cards = this.cards;	
		var p = new THREE.Vector3().copy(position);
		var cp = new THREE.Vector3();
		for(var i = 0, l = cards.length; i < l; i++) {
			var card = cards[i];
			if(card.id !== id) {
				cp.copy(card.position);
				//console.log(JSON.stringify(card.position), JSON.stringify(position));
				if(cp.sub(p).length() < THRESHOLD) {
					console.log('Found card in this position!');
					return false;
				}
			}
		}
		cards[id].position = position;
		//this.updateState(true);
		//netId.client.sendPeers(Network.MSG_NETID_MSG, {id: netId.id, msg: {event: 'movecard', id: id, target: position}}});
		return true;
	},
	OnCreateServer: function() {
		//console.info('GameBlueprint.server.OnCreateServer();');
		var self = this;
		var netId = this.netId;
		var snapCardPosition = self.context.assetdata.snapCardPosition;
		var cards = this.cards = [];
		for(var i = 0; i < 14; i++) {
			this.createCard();
		}
	},
	OnDestroy: function() {
		console.info('GameBlueprint.server.OnDestroy();');
	},
	OnSerialize: function(state) {
		return { cards: this.cards };
	},
	OnDeserialize: function(state) {
		//console.info('GameBlueprint.OnDeserialize(%s);', JSON.stringify(state));
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();