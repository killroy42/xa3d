(() => {

const blueprint = {
	name: 'EditorBlueprint',
	createNetObject: function(user, opts) {
		//console.info('EditorBlueprint.server.createNetObject(user, opts);');
		const {netId} = this;
		const netObject = netId.client.instantiateBlueprint('NetObjectBlueprint', opts);
		this.netObjects.push(netObject);
	},
	updateNetObject: function(user, opts) {
		//console.info('EditorBlueprint.server.updateNetObject(user, opts);');
		const {netId} = this;
		const netObject = this.netObjects.find(({netId: {id}}) => id === opts.id);
		netObject.state.position = opts.position;
		netObject.updateState();
	},
	OnCreateServer: function() {
		//console.info('EditorBlueprint.server.OnCreateServer();');
		const {state, context, netId, peerType} = this;
		/*
		netId.on('msg', (msg) => {
			netId.client.sendPeers(Network.MSG_NETID_MSG, {id: netId.id, msg: msg});
		});
		*/
		this.netObjects = [];
	},
	OnSerialize: function(state) {
		return { netObjects: this.netObjects };
	},
	OnDeserialize: function(state) {
		//console.info('EditorBlueprint.OnDeserialize(%s);', JSON.stringify(state));
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();