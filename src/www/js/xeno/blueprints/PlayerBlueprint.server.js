(function() {
'use strict';
var Network = require('../Network');


var blueprint = {
	name: 'PlayerBlueprint',
	OnCreateServer: function() {
		//console.info('PlayerBlueprint.server.OnCreateServer();');
		//console.log(this.context.server);
		var self = this;
		var game = this.context.game;
		var netId = this.netId;
		netId.on('msg', function(msg) {
			//console.log('MSG:', msg.event, msg.card);
			switch(msg.event) {
				case 'hover':
				case 'unhover':
				case 'lift':
				case 'drag':
					netId.client.sendPeers(Network.MSG_NETID_MSG, {id: netId.id, msg: msg});
					break;
				case 'drop':
					console.log('DROP:', JSON.stringify(msg));
					if(game.moveCard(msg.card, msg.target)) {
						netId.client.sendPeers(Network.MSG_NETID_MSG, {id: netId.id, msg: msg});
					} else {
						// cancel!
						var card = game.cards[msg.card];
						var packet = {id: netId.id, msg: {event: 'abortdrag', card: msg.card, position: card.position}};
						netId.client.send(Network.MSG_NETID_MSG, packet);
						netId.client.sendPeers(Network.MSG_NETID_MSG, packet);
					}
					break;
				default: console.log('!!MSG:', msg.event, msg.card);
			}
		});
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();