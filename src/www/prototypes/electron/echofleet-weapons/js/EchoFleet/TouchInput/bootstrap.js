(function() {
const THREE = require('THREE');
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {
	Transform, Collider, MeshComponent,
	Runtime, OrbitCamComponent, Cursor,
	TransformHandle, FontLoaderComponent, Text,
	TextureLoaderComponent,
	CSSFontLoaderComponent,
	MaterialComponent, PhongMaterial,
	GeometryComponent, BoxGeometryComponent,
	GenericMeshComponent,
} = require('ecsTHREE');
const {
	EntityStore,
	Node, Button, Editable,
	ContextMenu, ContextMenuButton
} = require('ecsEditor');
const Environment = require('Environment');


const Components = [
	Runtime,
	Transform, Collider,
	Cursor, OrbitCamComponent,
	Environment,
	TransformHandle,
	Node, Editable,
	FontLoaderComponent,
	TextureLoaderComponent,
	CSSFontLoaderComponent,
	MaterialComponent, PhongMaterial,
	GeometryComponent, BoxGeometryComponent,
	GenericMeshComponent,
];

const runtimeJson = {
	Runtime: {},
	//OrbitCamComponent: {position: {x: 0, y: 10.6, z: 3.7}, target: {x: 0, y: 0, z: 0.7}},
	Cursor: {},
	TransformHandle: {},
	Environment: {},
	FontLoaderComponent: {},
	TextureLoaderComponent: {},
	CSSFontLoaderComponent: {},
};

const createRuntime = () => {
	const entities = new EntityManager();
	entities.registerComponents(Components);
	return entities.createEntity(runtimeJson).runtime;
};

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		Components,
		createRuntime,
	};
	module.exports.bootstrap = module.exports;
}

})();