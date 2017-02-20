(() => {
const NetId = require('../NetId');
const {PeerType} = require('../BlueprintCore');

const blueprint = {
	name: 'UserBlueprint',
	OnCreateServer: function() {
		//console.info('UserBlueprint.server.OnCreateServer();');
		const {netId, peerType} = this;
		netId.on('msg', (msg) => {
			switch(msg.event) {
				case 'mousemove':
				case 'camchange':
					this.handleAvatarUpdate(msg); break;
				case 'createnetobject': this.handleCreateNetObject(msg.opts); break;
				case 'objchange': this.handleObjectUpdate(msg); break;
				default: console.info('[%s] msg:', peerType, msg);
			}
		});
	},
	handleAvatarUpdate(msg) {
		//console.info('UserBlueprint.server.handleAvatarUpdate(msg);');
		const {state, context: {editor}, netId, peerType} = this;
		netId.client.sendPeers(NetId.MSG_MSG, {id: netId.id, msg: msg});
	},
	handleObjectUpdate(msg) {
		//console.info('UserBlueprint.server.handleObjectUpdate(msg);');
		const {state, context: {editor}, netId, peerType} = this;
		//netId.client.sendPeers(NetId.MSG_MSG, {id: netId.id, msg: msg});
		//console.log(msg);
		editor.updateNetObject(this, msg);
	},
	handleCreateNetObject(opts) {
		//console.info('UserBlueprint.server.handleCreateNetObject(opts);');
		const {state, context: {editor}, netId, peerType} = this;
		editor.createNetObject(this, opts);
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();