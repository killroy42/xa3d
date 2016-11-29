(function() {
const THREE = require('THREE');
const assetdata = require('assetdata');
const {colors, dimensions} = assetdata;
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {Vector3} = THREE;
const {
	Transform, Collider, MeshComponent,
	Runtime, OrbitCamComponent, Cursor,
	TransformHandle, Text
} = require('ecsTHREE');
const {
	EntityStore,
	Node, Button, Editable,
	ContextMenu, ContextMenuButton
} = require('ecsEditor');
const {
	getRandomColor, CardData, Card, CardMesh, CardAnimator,
	BallCard, RoundedCornersCard, XACard
} = require('ecsCards');
const {ZoneData, CardZone} = require('ecsZones');
const Environment = require('Environment');
const {targetFactory} = require('cardTargeting');


const zonesJson = [
	{
		Transform: {position: {x: 0, y: 0, z: -1.3}, rotation: {x: 0, y: 1 * Math.PI, z: 0}},
		Collider: {scale: {x: 10.5, y: 0.1, z: 2.0}},
		Text: {value: 'Foe Board', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
		ZoneData: {
			kind: 'board', ownership: 'foe',
			visibility: 'all',
			layout: 'grid', slotCount: 7,
		},
		CardZone: {},
	},
	{
		Transform: {position: {x: 0, y: 0, z: 0.7}},
		Collider: {scale: {x: 10.5, y: 0.1, z: 2.0}},
		Text: {value: 'Own Board', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
		ZoneData: {
			kind: 'board', ownership: 'own',
			visibility: 'all',
			layout: 'grid', slotCount: 7,
		},
		CardZone: {},
	},
	{
		Transform: {position: {x: 0, y: 0, z: -5.2}, rotation: {x: 0, y: 1 * Math.PI, z: 0}},
		Collider: {scale: {x: 8, y: 0.1, z: 2.2}},
		Text: {value: 'Foe Hand', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
		ZoneData: {
			kind: 'hand', ownership: 'foe',
			visibility: 'owner',
			layout: 'fan', slotCount: 10,
		},
		CardZone: {},
	},
	{
		Transform: {position: {x: 0, y: 0, z: 4.8}},
		Collider: {scale: {x: 8, y: 0.1, z: 2.4}},
		Text: {value: 'Own Hand', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
		ZoneData: {
			kind: 'hand', ownership: 'own',
			visibility: 'owner',
			layout: 'fan', slotCount: 10,
		},
		CardZone: {},
	},
	{
		Transform: {position: {x: 6.8, y: 0, z: 1.8}},
		Collider: {scale: {x: 1.8, y: 0.1, z: 1.5}},
		Text: {value: 'Own Deck', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
		ZoneData: {
			kind: 'deck', ownership: 'own',
			visibility: 'none',
			layout: 'deck', slotCount: 60,
		},
		CardZone: {},
	},
	{
		Transform: {position: {x: 6.8, y: 0, z: -1.8}},
		Collider: {scale: {x: 1.8, y: 0.1, z: 1.5}},
		Text: {value: 'Foe Deck', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
		ZoneData: {
			kind: 'deck', ownership: 'foe',
			visibility: 'none',
			layout: 'deck', slotCount: 60,
		},
		CardZone: {},
	}
];
const cardJson = {CardData: {type: 1}, Card: {}, CardAnimator: {}};

const createMainMenu = entities => {
	const cams = {
		board: {position: new Vector3(0, 10.6, 3.7), target: new Vector3(0, 0, 0.7), speed: 8},
		attackLeft: {position: new Vector3(-3.3, 2.9, 4.9), target: new Vector3(-0.5, -1.9, -4.6), speed: 14},
		attackRight: {position: new Vector3(3.3, 2.9, 4.9), target: new Vector3(0.5, -1.9, -4.6), speed: 14},
		drawOwn: {position: new Vector3(5.9, 4.7, 7.5), target: new Vector3(3.6, -2.3, -0.7), speed: 6},
	};
	const applyCam = (camName) => new Promise((resolve, reject) => {
		const orbitCam = entities.findComponent(OrbitCamComponent);
		const cam = cams[camName];
		orbitCam.slideCamera(cam.position, cam.target, cam.speed, resolve);
	});
	const delayP = delay => new Promise((resolve, reject) => setTimeout(resolve, delay));
	const getButton = label => entities.all.find(({button, text}) => button && text.value === label);
	const onButtonPress = (label, handler) => getButton(label).collider.addEventListener('mouseup', handler);
	const buttons = {
		'Flip Zone Display': ()=>{
			const zones = entities.queryComponents([CardZone]);
			zones.forEach(({zoneData}) => {
				if(zoneData.layout === 'grid') zoneData.layout = 'fan';
				else if(zoneData.layout === 'fan') zoneData.layout = 'grid';
			});
		},
		'Board Camera': ()=>applyCam('board'),
		'Left Camera': ()=>applyCam('attackLeft').then(delayP(1000)).then(()=>applyCam('board')),
		'Right Camera': ()=>applyCam('attackRight').then(delayP(1000)).then(()=>applyCam('board')),
		'Draw Camera': ()=>applyCam('drawOwn').then(delayP(1000)).then(()=>applyCam('board')),
	};
	const mainMenu = entities.createEntity({Transform: {position: {x: -8, y: 0, z: -5}}, Node: {}});
	Object.keys(buttons).forEach((label, idx) => {
		const button = entities.createEntity({Transform: {position: {x: 0, y: 0, z: idx * 0.7}}, Button: {label}});
		mainMenu.node.attach(button);
		button.collider.addEventListener('mouseup', buttons[label]);
	});
};

const init = () => {
	const entities = new EntityManager();
	entities.registerComponents([
		Runtime,
		Transform, Collider,
		Cursor, OrbitCamComponent,
		Environment,
		Text, TransformHandle,
		EntityStore,
		Button,
		Node, ContextMenu, Editable,
		CardData, Card,
		BallCard, RoundedCornersCard, XACard,
		CardAnimator,
		ZoneData, CardZone,
	]);
	entities.createEntity({
		Runtime: {},
		OrbitCamComponent: {position: {x: 0, y: 10.6, z: 3.7}, target: {x: 0, y: 0, z: 0.7}},
		Cursor: {},
		TransformHandle: {},
		EntityStore: {},
		Environment: {},
	});
	const {floor} = entities.findComponent(Environment);
	floor.addEventListener('mousedown', event => {
		if(event.originalEvent.shiftKey) {
			const orbitCam = entities.findComponent(OrbitCamComponent);
			console.log('position:', orbitCam.camera.position);
			console.log('target:', orbitCam.getTarget());
		}
	});
	createMainMenu(entities);
	zonesJson.forEach(zoneJson => entities.createEntity(zoneJson).addComponent(Editable));
	//console.log(entities.queryComponents([ZoneData]).map(e => e.zoneData).join('\n'));
	const zones = entities.queryComponents([CardZone]);
	zones
		.forEach(({zoneData: {kind}, cardZone: zone}) => {
			const kindCounts = {deck: 5, hand: 3, board: 1};
			for(var i = 0; i < kindCounts[kind]; i++) {
				const card = entities.createEntity(cardJson);
				zone.attachCard(card);
				zone.insertCard(card);
			}
		});
	for(var i = 0; i < 20;i++) {
		setTimeout(() => {
			const zone = zones[Math.floor(Math.random() * zones.length)].cardZone;
			const card = entities.createEntity(cardJson);
			zone.attachCard(card);
			zone.insertCard(card);
		}, i * 100);
	}
	let getTargets = targetFactory();
	setTimeout(() => {
		console.log(zones
			.map(({id, zoneData: {kind, ownership}, cardZone: {_cards}}) =>
				`[${id}]${kind}.${ownership} cards: [${_cards.map(card=>card.id).join(', ')}]`)
			.join('\n')
		);
		/*
			- card draw:
				from: deck.own.first
				to: hand.own.last.right
		*/
		const testSelectors = [
			'deck.own.first',
			'hand.own.last',
			'any',
			'hand.own',
			'[deck, hand].own',
			'any.own.3',
			'hand.own.1.adjacent',
			'hand.own.1.[first, adjacent]',
		];
		testSelectors.forEach(selector => {
			const targets = getTargets(zones, selector);
			console.log('"%s" found (%s) cards: [%s]', selector, targets.length, targets.map(card=>card.id).join(', '));
		});
	}, 500);

	entities.findComponent(Runtime).start();
};


document.addEventListener('DOMContentLoaded', init);
	
})();