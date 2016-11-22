(() => {
/* jshint validthis: true */
'use strict';

const {Entity, Component, System, EntityManager} = require('XenoECS');
const {SceneComponent} = require('components');
const {colors, dimensions, getRandomPortraitUrl} = require('assetdata');
const {makeRoundedRectShape} = require('GeometryHelpers');
const Transform = require('Transform');
const XenoCard3D = require('XenoCard3D');
const {
	LineBasicMaterial,
	MeshBasicMaterial, Line, Mesh, ExtrudeGeometry,
	MeshPhongMaterial, TextureLoader
} = require('THREE');

var textureLoader, xenoCard3D;
const loadTexture = (url) => {
	if(textureLoader === undefined) {
		textureLoader = new TextureLoader();
		textureLoader.crossOrigin = 'Anonymous';
	}
	var resolverFunc;
	const texture = textureLoader.load(url, () => resolverFunc() , undefined, (err) => console.error(err));
	//texture.minFilter = THREE.LinearFilter;
	texture.promise = new Promise((resolve, reject) => resolverFunc = resolve);
	//texture.anisotropy = this.renderer.getMaxAnisotropy();
	return texture;
};

const __createCardMesh = (w, h, radius = 0.2, color = colors.BlueGrey700) => {
	const shape = makeRoundedRectShape(0, 0, w, h, radius);
	//const geo = shape.createPointsGeometry(12);
	const thickness = 0.05;
	const geo = new ExtrudeGeometry(shape, {
		amount: thickness, bevelEnabled: false, steps: 1
	});
	geo.rotateX(0.5 * Math.PI);
	geo.translate(0, thickness, 0);
	geo.computeBoundingBox();
	//const mesh = new Line(geo, new LineBasicMaterial({color}));
	const mesh = new Mesh(geo, new MeshPhongMaterial({color}));
	mesh.name = 'cardMesh';
	/*
	if(xenoCard3D === undefined) {
		xenoCard3D = new XenoCard3D();
	}
	const card = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
	card.scale.set(0.01, 0.01, 0.01);
	card.rotation.set(-0.5 * Math.PI, 0, 0);
	mesh.add(card);
	*/
	return mesh;
};

const createCardOutline = (
	width = dimensions.unitScale.card.width,
	height = dimensions.unitScale.card.height,
	color = colors.BlueGrey800,
	corner = 0.2
	) => {
	const shape = makeRoundedRectShape(0, 0, width, height, corner);
	const geo = shape.createPointsGeometry(12);
	geo.rotateX(0.5 * Math.PI);
	geo.computeBoundingBox();
	const mesh = new Line(geo, new LineBasicMaterial({color}));
	mesh.name = 'cardOutline';
	return mesh;
};
const createCardMesh = (
	width = dimensions.unitScale.card.width,
	height = dimensions.unitScale.card.height,
	color = colors.BlueGrey700,
	corner = 0.2,
	thickness = 0.05
	) => {
	const shape = makeRoundedRectShape(0, 0, width, height, corner);
	const geo = new ExtrudeGeometry(shape, {amount: thickness, bevelEnabled: false, steps: 1});
	geo.rotateX(0.5 * Math.PI);
	geo.translate(0, thickness, 0);
	geo.computeBoundingBox();
	const mesh = new Mesh(geo, new MeshPhongMaterial({color}));
	mesh.name = 'cardMesh';
	return mesh;
};

class CardData extends Component {
	constructor() {
		super();
		this.name = 'Card';
	}
}
class CardView extends SceneComponent {
	constructor() {
		super();
		this.width = dimensions.unitScale.card.width;
		this.height = dimensions.unitScale.card.height;
		this.radius = 0.2;
	}
	create() {
		const {transform} = this._entity;
		const {width, height, radius, color} = this;
		const mesh = createCardMesh(width, height, color, radius);
		return mesh;
	}
}
class Cards extends System {
	constructor() {
		super();
		this.setComponents([CardData, Transform, CardView]);
	}
}
const cardMaker = (app, defaults) => ({position} = defaults, entity) => {
	const {scene} = app;
	entity
		//.addTag('selectable')
		.addComponent(CardData)
		.addComponent(Transform)
		.addComponent(CardView);
	const {transform} = entity;
	transform.addTo(scene);
	transform.position.copy(position);
	return entity;
};

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		Cards,
		cardMaker,
		createCardOutline,
		createCardMesh,
	};
	module.exports.ecsCards2 = module.exports;
}
})();