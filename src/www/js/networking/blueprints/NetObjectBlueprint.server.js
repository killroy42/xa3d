(() => {
const NetId = require('../NetId');
const {PeerType} = require('../BlueprintCore');


const blueprint = {
	name: 'NetObjectBlueprint',
	OnCreateServer: function() {
		//console.info('NetObjectBlueprint.server.OnCreateServer();');
		const {state, context, netId, peerType} = this;
		netId.on('msg', (msg) => {
			//console.info('[%s] msg:', peerType, msg);
			netId.client.sendPeers(NetId.MSG_MSG, {id: netId.id, msg: msg});
		});
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();