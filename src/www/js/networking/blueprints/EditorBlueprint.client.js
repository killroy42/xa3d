(() => {
const {
	Vector3,
	Mesh,
	BoxGeometry, SphereGeometry,
	MeshBasicMaterial,
	CameraHelper,
	PlaneGeometry, MeshPhongMaterial,
} = require('THREE');
const {colors} = require('assetdata');
const {PeerType} = require('./BlueprintCore');

const blueprint = {
	name: 'EditorBlueprint',
	// Client
		OnCreateClient: function() {
			//console.info('EditorBlueprint.client.OnCreateClient();');
		},
	// Proxy
		proxyHandleMsg: function(msg) {
			//console.info('EditorBlueprint.client.proxyHandleMsg(msg);');
		},
		OnCreateProxy: function() {
			//console.info('EditorBlueprint.client.OnCreateProxy();');
		},
	OnDestroy: function() {
		//console.info('EditorBlueprint.client.OnDestroy();');
	},
	OnDeserialize: function(state) {
		//console.info('EditorBlueprint(client).OnDeserialize(%s);', JSON.stringify(state));
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();