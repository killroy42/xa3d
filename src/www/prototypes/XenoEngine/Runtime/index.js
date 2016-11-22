(function() {
//const THREE = require('THREE');
const assetdata = require('assetdata');
const {colors, dimensions} = assetdata;
const {EntityManager} = require('XenoECS');
const {
	Transform, Collider,
	Runtime, OrbitCamComponent, Cursor,
} = require('ecsTHREE');
const {getRandomColor, CardData, Card, CardMesh, Animator} = require('ecsCards');
const Environment = require('Environment');


const COMPONENTS = [
	Runtime,
	Transform, Collider,
	Cursor, OrbitCamComponent,
	Environment, 
	CardData, Card,
	Animator, 
];

const init = () => {
	const entities = new EntityManager().registerComponents(COMPONENTS);
	entities.createEntity({
		Runtime: {},
		Cursor: {},
		OrbitCamComponent: {
			position: {x: 0, y: 16, z: 3},
			target: {x: 0, y: 0, z: 0.4},
		},
		Environment: {},
	});
	for(var i = 0; i < 7 * 3; i++) {
		const x = (i % 7 - 3) * dimensions.unitScale.card.width;
		const z = Math.floor(i / 7 - 1) * dimensions.unitScale.card.height;
		const y = 2;
		entities.createEntity({
			Transform: {
				position: {x, y, z}
			},
			CardData: {
				color: getRandomColor(),
				type: Math.floor(Math.random() * 3)
			},
			Card: {},
			Animator: {},
		});
	}
	const {floor} = entities.findComponent(Environment);
	const cards = entities.queryComponents([Card]);
	floor.addEventListener('mousedown', function(event) {
		if(event.button === 2) cards.forEach(({cardData}) => cardData.color = getRandomColor());
	});
	cards.forEach(({collider, xACard, animator}) => {
		collider.addEventListener('mousedown', function(event) {
			const {entity, entity: {transform, collider, cardData, card}} = this;
			//if(event.button === 0) cardData.set({color: getRandomColor()});
			if(event.button === 2) cardData.type = (cardData.type + 1) % 3;
			if(event.button === 0) animator.animate(2);
			//if(event.button === 2) animator.animate(0);
		});
	});
	//console.log(entities.all.join('\n'));
	entities.findComponent(Runtime).start();
};


document.addEventListener('DOMContentLoaded', init);
	
})();