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
	name: 'UserBlueprint',
	createNetObject(opts) {
		//console.info('UserBlueprint.client.createNetObject(opts);');
		const {state, context, netId, peerType} = this;
		netId.send({event: 'createnetobject', opts});
	},
	// Client
		OnCreateClient: function() {
			//console.info('UserBlueprint.client.OnCreateClient();');
			this.dispatchEvent('clientready', {target: this});
		},
	// Proxy
		proxyHandleMsg: function(msg) {
			//console.info('UserBlueprint.client.proxyHandleMsg(msg);');
			const {cursor, camHelper} = this;
			switch(msg.event) {
				case 'mousemove': cursor.position.copy(msg.point); break;
				case 'camchange': {
					const lookAt = new Vector3().addVectors(msg.position, msg.direction);
					camHelper.camera.position.copy(msg.position);
					camHelper.camera.lookAt(lookAt);
					camHelper.update();
					break;
				}
			}
		},
		proxyCreateCursor: () => new Mesh(
			new SphereGeometry(0.1, 16, 16),
			new MeshBasicMaterial({
				color: colors['Light Blue'][200],
				transparent: true,
				opacity: 0.5,
			})
		),
		OnCreateProxy: function() {
			//console.info('UserBlueprint.client.OnCreateProxy();');
			const {state, context, netId, peerType} = this;
			const {app: {scene, camera}} = context;
			this.proxyHandleMsg = this.proxyHandleMsg.bind(this);
			netId.on('msg', (msg) => this.proxyHandleMsg(msg));
			this.cursor = this.proxyCreateCursor();
			scene.add(this.cursor);
			const cam = camera.clone();
			scene.add(cam);
			//cam.position.z += 100;
			this.camHelper = new CameraHelper(cam);
			scene.add(this.camHelper);
		},
	// shared
		OnDestroy: function() {
			//console.info('UserBlueprint.client.OnDestroy();');
			const {peerType, context} = this;
			const {app: {scene, mouseHandler, controls, fpsControls}} = context;
			if(peerType === PeerType.CLIENT) {
				mouseHandler.removeEventListener('mousemove', this.handleMousemove);
				controls.removeEventListener('change', this.handleControlChange);
				fpsControls.removeEventListener('change', this.handleControlChange);
			}
			else if(peerType === PeerType.PROXY) {
				scene.remove(this.cursor);
				scene.remove(this.camHelper);
			}
		},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();