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
	name: 'NetObjectBlueprint',
	OnCreateProxy: function() {
		console.info('NetObjectBlueprint.client.OnCreateProxy();');
		const {context: {scene, entityManager}, state: {components}} = this;
		const entity = entityManager.createEntity(components);
		this.entity = entity;
		entity.transform.position.copy(this.state.position);
		entity.transform.addTo(scene);
		//const entity = em.createEntity([Transform, Collider, ControlHandle, ControlView, CorridorNode]);
		entity.addComponent('NetId');
		entity.getComponent('NetId').set(this.netId);
		entity.update();
	},
	OnDestroy: function() {
		console.info('NetObjectBlueprint.client.OnDestroy();');
	},
	OnDeserialize(serialized) {
		//console.info('NetObjectBlueprint.OnDeserialize(%s);', JSON.stringify(serialized));
		const transform = this.entity.getComponent('Transform');
		transform.position.copy(serialized.position);
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();