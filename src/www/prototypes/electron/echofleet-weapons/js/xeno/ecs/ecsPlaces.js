(() => {
/* jshint validthis: true */
'use strict';

const {Entity, Component, System, EntityManager} = require('XenoECS');
const {Geometry, Vector3, Matrix4, LineBasicMaterial, Line} = require('THREE');
const {colors, dimensions} = require('assetdata');
const {Transform, SceneComponent, Collider} = require('components');
const {Selectable} = require('ecsSelectable');

const createPlaceMesh = (color = colors.grey200) => {
	const geo = new Geometry();
	geo.vertices.push(
		new Vector3(-0.5, 0, -0.5),
		new Vector3( 0.5, 0, -0.5),
		new Vector3( 0.5, 0,  0.5),
		new Vector3(-0.5, 0,  0.5),
		new Vector3(-0.5, 0, -0.5)
	);
	const outline = new Line(geo, new LineBasicMaterial({color}));
	outline.name = 'placeOutline';
	return outline;
};

const applyPlaceDisplay = (displayFunc) => (place) => {
	const {transform, placeData} = place;
	const {display, cards} = placeData;
	transform._object3d.updateMatrixWorld(true);
	const placeTransform = new Matrix4();
	placeTransform.copyPosition(transform._object3d.matrixWorld);
	placeTransform.extractRotation(transform._object3d.matrixWorld);
	cards.forEach((card, idx) => {
		card.transform.reset();
		displayFunc(place, card, idx);
		card.transform._object3d.updateMatrix();
		card.transform._object3d.applyMatrix(placeTransform);
	});
};

const placeDisplayFunctions = {
	hidden: applyPlaceDisplay((place, card, idx) => {
		card.transform.visible = false;
	}),
	grid: applyPlaceDisplay((place, card, idx) => {
		const {transform, placeData} = place;
		const {display, capacity, cards} = placeData;
		var slotW = transform.scale.x / capacity;
		var slotH = transform.scale.z;
		var totalW = cards.length * slotW;
		const {transform: {position, rotation}} = card;
		position.x += -0.5 * totalW + (idx + 0.5) * slotW;
	}),
	fan: applyPlaceDisplay((place, card, idx) => {
		const {transform, placeData} = place;
		const {display, cards, capacity} = placeData;
		const len = cards.length;
		var slotW = transform.scale.x / capacity;
		var slotH = transform.scale.z;
		var totalW = len * slotW;
		const {transform: {position, rotation}} = card;
		position.x = -0.5 * totalW + (idx + 0.5) * slotW;
		position.z = (0.5 + Math.sin((1 + 1 * idx / (capacity - 1)) * Math.PI)) * slotH;
		rotation.z = -0.025 * transform.scale.y * Math.PI;
		rotation.y = (-0.25 + 0.5 * (1 - idx / (capacity - 1))) * Math.PI;
	}),
	stack: applyPlaceDisplay((place, card, idx) => {
		const {transform, placeData} = place;
		const {display, cards, capacity} = placeData;
		var slotW = transform.scale.x / capacity;
		var slotH = transform.scale.z;
		var slotD = 0.02 * transform.scale.y;
		var totalW = cards.length * slotW;
		const {transform: {position, rotation}} = card;
		position.x += -0.5 * totalW + (idx + 0.5) * slotW;
		position.y += (idx + 0.5) * slotD;
	}),
};

class PlaceData extends Component {
	constructor() {
		super();
		this.name = 'Place';
		this.display = 'hidden';
		this.capacity = 1;
		this.cards = [];
		this.transitions = {};
	}
	OnDetachComponent() {
		while(this.cards.length > 0) this.cards.pop().destroy();
	}
	toJSON() {
		const {_entity, name, display, capacity, cards, transitions} = this;
		const {position, scale, rotation} = _entity.transform;
		return {name, display, capacity, position, scale, rotation,
			cards: cards.length,
			transitions,
		};
	}
}

class PlaceView extends SceneComponent {
	constructor() {
		super();
	}
	create() {
		return createPlaceMesh();
	}
	/*
	OnAttachComponent(entity) {
		const {transform} = entity;
		this._mesh = createPlaceMesh();
		transform.add(this._mesh);
	}
	OnDetachComponent(entity) {
		const {transform} = entity;
		//transform.remove(this.mesh);
	}
	*/
	arrangeCards() {
		const {_entity} = this;
		const {transform, placeData} = _entity;
		const {display} = placeData;
		if(placeDisplayFunctions[display]) placeDisplayFunctions[display](_entity);
	}
}

class PlaceGui extends Component {
	get(prop) {
		//console.info('PlaceGui.get(%s);', prop);
		const {_entity} = this;
		const {transform, placeData} = _entity;
		const {position, scale, rotation} = transform.object3d;
		if(/^position\./.test(prop)) return position[prop.split('.')[1]];
		if(/^scale\./.test(prop)) return scale[prop.split('.')[1]];
		if(/^rotation\./.test(prop)) return rotation[prop.split('.')[1]] * 180 / Math.PI;
		if(/^cards.amount$/.test(prop)) return placeData.cards.length;
		if(/^transitions\./.test(prop)) return placeData.transitions[prop.split('.')[1]] || 'none';
		var val = placeData[prop.toLowerCase()];
		if(val === undefined) val = '';
		return val;
	}
	set(prop, val) {
		//console.info('PlaceGui.set(%s);', prop, val);
		const {_entity} = this;
		const {transform, placeData} = _entity;
		const {position, scale, rotation} = transform.object3d;
		if(/^position\./.test(prop)) return position[prop.split('.')[1]] = parseFloat(val);
		if(/^scale\./.test(prop)) return scale[prop.split('.')[1]] = parseFloat(val);
		if(/^rotation\./.test(prop)) return rotation[prop.split('.')[1]] = parseFloat(val) * Math.PI / 180;
		if(/^cards.amount$/.test(prop)) return placeData.cards.length;
		if(/^transitions\./.test(prop)) return placeData.transitions[prop.split('.')[1]] = val;
		return placeData[prop.toLowerCase()] = val;
	}
}

class Places extends System {
	constructor() {
		super();
		this.setComponents([PlaceData, Transform, PlaceView]);
	}
	loadPlacesFromJson(json) {
		this.removeAllEntities();
		json && json.places && json.places.forEach((data) => this.create(data));
		return this;
	}
	savePlacesToJson() {
		const places = this.getEntities();
		return {places: places.map(place => place.placeData.toJSON())};
	}
}

const placeMaker = (app, defaults) => (opts, entity) => {
	const {name, display, capacity, cards, position, scale, rotation, transitions} = Object.assign({}, defaults, opts);
	const {scene} = app;
	entity
		.addTag('selectable')
		.addComponent(PlaceData)
		.addComponent(Transform)
		.addComponent(PlaceView)
		.addComponent(PlaceGui)
		.addComponent(Collider)
		.addComponent(Selectable)
		;
	const {placeData, transform, placeView} = entity;
	transform.addTo(scene);
	transform.position.copy(position);
	transform.scale.copy(scale);
	transform.rotation.copy(rotation);
	placeData.name = name;
	placeData.display = display;
	placeData.capacity = capacity;
	placeData.transitions = transitions || {};
	for(var i = 0; i < cards; i++)
		placeData.cards.push(entity._manager.cards.create());
	placeView.arrangeCards();
	return entity;
};


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		PlaceData,
		PlaceView,
		PlaceGui,
		Places,
		placeMaker,
		placeDisplayFunctions,
	};
	module.exports.ecsPlaces = module.exports;
}
})();