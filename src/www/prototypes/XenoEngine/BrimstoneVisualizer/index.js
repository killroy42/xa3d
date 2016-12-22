(function() {
const THREE = require('THREE');
const assetdata = require('assetdata');
const {colors, dimensions} = assetdata;
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {Vector3} = THREE;
const {
	Transform, Collider, MeshComponent,
	Runtime, OrbitCamComponent, Cursor,
	TransformHandle, FontLoaderComponent, Text,
	TextureLoaderComponent,
	CSSFontLoaderComponent,
} = require('ecsTHREE');
const {
	EntityStore,
	Node, Button, Editable,
	ContextMenu, ContextMenuButton
} = require('ecsEditor');
const {
	getRandomColor, CardData, Card, CardMesh, CardAnimator,
	BallCard, RoundedCornersCard, XACard, HSCard
} = require('ecsCards');
const {ZoneData, CardZone} = require('ecsZones');
const Environment = require('Environment');
const {targetFactory} = require('cardTargeting');
const {cloneDeep} = require('_');


const urls = {
	cards: (v = 'v1.15590.pretty') => `http://localhost/data/cards_${v}.json`,
};

const Components = [
	Runtime,
	Transform, Collider,
	Cursor, OrbitCamComponent,
	Environment,
	FontLoaderComponent, Text, TransformHandle,
	EntityStore,
	Button,
	Node, ContextMenu, Editable,
	CardData, Card, CardMesh,
	BallCard, RoundedCornersCard, XACard,
	CardAnimator,
	ZoneData, CardZone,
	TextureLoaderComponent,
	CSSFontLoaderComponent,
];

const runtimeJson = {
	Runtime: {},
	OrbitCamComponent: {position: {x: 0, y: 10.6, z: 3.7}, target: {x: 0, y: 0, z: 0.7}},
	Cursor: {},
	TransformHandle: {},
	EntityStore: {},
	Environment: {},
	FontLoaderComponent: {},
	TextureLoaderComponent: {},
	CSSFontLoaderComponent: {},
};

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
	},
	{
		Transform: {position: {x: -8.9, y: 0, z: 0.7}},
		Collider: {scale: {x: 1.5*3, y: 0.1, z: 2*3}},
		Text: {value: 'Own Debug', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
		ZoneData: {
			kind: 'debug', ownership: 'own',
			visibility: 'all',
			layout: 'grid', slotCount: 9, columns: 3
		},
		CardZone: {},
	},

];

const cardJson = {
	CardData: {type: 1},
	//Node: {children: [
		//{Text: {value: 'Cost: 2', position: {x: 0, y: 0.04, z: -0.5 + 0 * 0.3}, scale: {x: 0.18, y: 0.01, z: 0.182}}},
		//{Text: {value: 'HP: 2', position: {x: 0, y: 0.04, z: -0.5 + 1 * 0.3}, scale: {x: 0.18, y: 0.01, z: 0.18}}},
		//{Text: {value: 'Attack: 2', position: {x: 0, y: 0.04, z: -0.5 + 2 * 0.3}, scale: {x: 0.18, y: 0.01, z: 0.18}}},
		//{Text: {value: 'Effect 1', position: {x: 0, y: 0.04, z: -0.5 + 3 * 0.3}, scale: {x: 0.18, y: 0.01, z: 0.18}}},
		//{Text: {value: 'Effect 2', position: {x: 0, y: 0.04, z: -0.5 + 4 * 0.3}, scale: {x: 0.18, y: 0.01, z: 0.18}}},
	//]},
	Card: {},
	CardAnimator: {}
};

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

const testTargeting = entities => {
	const zones = entities.queryComponents([CardZone]);
	let getTargets = targetFactory();
	setTimeout(() => {
		console.log(zones
			.map(({id, zoneData: {kind, ownership}, cardZone: {_cards}}) =>
				`[${id}]${kind}.${ownership} cards: [${_cards.map(card=>card.id).join(', ')}]`)
			.join('\n')
		);
		/*
			[Card structure]
				- template
				- props
			[Targeting]
				- card draw:
					from: deck.own.first
					to: hand.own.last.right
			[Effects]
				- trigger
				- change props
					- dealDamage
		*/
		const testSelectors = [
			'deck.own.first',
			'hand.own.last',
			'any',
			'hand.own',
			'[deck, hand].own',
			'any.own.3',
			'deck.own.1.adjacent',
			'hand.foe.1.[first, adjacent]',
			'hand.own.1.[first, [left, right]]',
			'hand.own.1.[first, [adjacent]]',
		];
		testSelectors.forEach(selector => {
			const targets = getTargets(zones, selector);
			console.log('"%s" found (%s) cards: [%s]', selector, targets.length, targets
				.map(card=>card.cardData.json.name)
				.join(', '));
		});
		//console.log(entities.all.join('\n'));
	}, 500);
};

const testGameApi = () => {
	const playerNames = ['First Player', 'Second Player', 'Third Player', 'Fourth Player'];
	/*
		[Progression]
		initialState = (game) => state
		getMoves = (game, state) => [possible moves...]
		applyMove = (game, state0, move) => state1
	*/
	const initialState = ({players, zones, cards}) => {
		const state = {};
		state.currentPlayer = 0;
		state.gameProgress = 0;
		state.turnProgress = 0;
		state.pending = [];
		state.pending.push(game.startAction);
		state.players = [];
		for(var i = 0; i < players.count; i++) {
			const player = {
				name: playerNames[i],
				zones: {}
			};
			Object.keys(zones).forEach(name => player.zones[name] = {cards: []});
			// Deck
			for(var j = 0; j < zones.deck.initialSize; j++) {
				player.zones.deck.cards.push(cards.find(card => card.id === 'carda'));
			}
			state.players.push(player);
		}		
		return state;
	};
	const getNextOp = ({actions}, state0) => {
		const moves = [];
		//console.error('getNextOp');
		var next = state0.pending[0];
		//console.log('next:', next);
		while(Array.isArray(actions[next])) {
			next = actions[next][0];
			//console.log('next:', next);
		}
		return next;
	};
	const applyOp = ({cards, actions}, state0, op) => {
		console.info('applyOp(game, state, "%s");', op.op);
		const state1 = cloneDeep(state0);
		const {pending} = state1;
		let playerIdx, player;
		console.log('OP:', JSON.stringify(op));
		switch(op.op) {
			case 'moveCard':
				console.error('EXEC [moveCard]');
				console.log('pending:', pending);
				for(var i = 0; i < 10; i++) {
					pending.unshift.apply(pending, actions[pending.shift()]);
					if(pending[0] === op) break;
				}
				pending.shift();
				console.log('pending:', pending);

				// Draw card own
				if(op.source === 'deck.own.pick.1' && op.target === 'hand.own.last') {
					player = state1.players[state1.currentPlayer];
					player.zones.hand.cards.push(player.zones.deck.cards.pop());
				}
				// Draw card for
				else if(op.source === 'deck.foe.pick.1' && op.target === 'hand.foe.last') {
					player = state1.players[(state1.currentPlayer + 1) % game.players.count];
					player.zones.hand.cards.push(player.zones.deck.cards.pop());
				}
				// gain starter coin
				else if(op.source === 'new.prop(id=coin)' && op.target === 'hand.foe.last') {
					player = state1.players[(state1.currentPlayer + 1) % game.players.count];
					//player.zones.hand.cards.push(player.zones.deck.cards.pop());
					player.zones.hand.cards.push(cards.find(card => card.id === 'coin'));
				}
				else {
					throw new Error('OP not implemented');
				}
			//startCoin: [{op: 'moveCard', source: 'new.prop(id=coin)', target: 'hand.foe.last'}],
				break;
			default: throw new Error('Unknown OP');
		}
		return state1;
	};
	//const getMoves = ({actions}, {pending}) => {
	const applyMove = (game, state, move) => {
		const nextState = {};
		return nextState;
	};
	const game = {
		cards: [
			{id: 'coin', cost: 0},
			{id: 'carda', cost: 1},
		],
		zones: {
			player: {initialSize: 1},
			deck: {initialSize: 5},
			hand: {initialSize: 0},
			board: {initialSize: 0},
			graveyard: {initialSize: 0},
		},
		players: {count: 2},
		actions: {
			changeTurn: [{op: 'endTurn'}, 'turn'],
			playerMove: {op: 'getPlayerMove'},
			drawOwn: [{op: 'moveCard', source: 'deck.own.pick.1', target: 'hand.own.last'}],
			drawFoe: [{op: 'moveCard', source: 'deck.foe.pick.1', target: 'hand.foe.last'}],
			startCoin: [{op: 'moveCard', source: 'new.prop(id=coin)', target: 'hand.foe.last'}],
			startGameFirst: ['drawOwn', 'drawOwn', 'drawOwn'],
			startGameSecond: ['drawFoe', 'drawFoe', 'drawFoe', 'drawFoe', 'startCoin'],
			startGame: ['startGameFirst', 'startGameSecond'],
			endTurn: ['changeTurn', 'turn'],
			turn: ['drawOwn', 'playerMove', 'changeTurn'],
			game: ['startGame', 'turn', 'endGame'],
		},
		startAction: 'game'
	};
	/*
		game: static game data and valid actions
		state: Current state of game (excl. static game data)

		op: internal, hard-cored operation
		action: (action|op)+
		move: action+
			e.g.:
			- Play card
			- Attack unit
			- End turn
			- etc

		Game flow: game + state0 + action -> state1	
		Player move: game + state0 + move -> state1

		1. [startTurn, playerMove, nextTurn]
			-> startTurn (drawCard)
		2. [drawCard, playerMove, nextTurn]
		3. [playerMove, nextTurn]
			-> playerMove (attack)
		4. [attack, nextTurn]
	*/
	var currentState, nextState, nextOp;
	const states = [];
	states.push(initialState(game));

	console.groupCollapsed('game');
	console.log(JSON.stringify(game, null, '  '));
	console.groupEnd('game');

	const doOp = () => {
		currentState = states[states.length - 1];
		console.groupCollapsed('currentState');
		console.log(JSON.stringify(currentState, null, '  '));
		console.groupEnd('currentState');
		nextOp = getNextOp(game, currentState);
		console.log('currentState.pending:', currentState.pending);
		console.log('nextOp:', nextOp);
		nextState = applyOp(game, currentState, nextOp);
		states.push(nextState);
	};

	// Start game first player
	doOp(); // draw 1
	doOp(); // draw 2
	doOp(); // draw 3
	// Start game second player
	doOp(); // draw 1
	doOp(); // draw 2
	doOp(); // draw 3
	doOp(); // draw 4
	doOp(); // get coin

	doOp(); // turn

	console.groupCollapsed('nextState');
	console.log(JSON.stringify(nextState, null, '  '));
	console.groupEnd('nextState');
};

const testHSCard = entities => {
	const cardJson = {
		CardData: {type: 1, color: 0xffffff},
		Node: {children: [
			//{Text: {value: 'Cost: 2', position: {x: 0, y: 0.04, z: -0.5 + 0 * 0.3}, scale: {x: 0.18, y: 0.01, z: 0.182}}},
			//{Text: {value: 'HP: 2', position: {x: 0, y: 0.04, z: -0.5 + 1 * 0.3}, scale: {x: 0.18, y: 0.01, z: 0.18}}},
			//{Text: {value: 'Attack: 2', position: {x: 0, y: 0.04, z: -0.5 + 2 * 0.3}, scale: {x: 0.18, y: 0.01, z: 0.18}}},
			//{Text: {value: 'Effect 1', position: {x: 0, y: 0.04, z: -0.5 + 3 * 0.3}, scale: {x: 0.18, y: 0.01, z: 0.18}}},
			//{Text: {value: 'Effect 2', position: {x: 0, y: 0.04, z: -0.5 + 4 * 0.3}, scale: {x: 0.18, y: 0.01, z: 0.18}}},
		]},
		Card: {meshTypes: [RoundedCornersCard, HSCard]},
		CardAnimator: {}
	};
	//const card = entities.createEntity(cardJson);
	//card.addComponent(Editable);
	//card.transform.position.set(0, 8, 3);
};

const init = () => {
	const entities = new EntityManager();
	entities.registerComponents(Components);
	entities.createEntity(runtimeJson);
	entities.findComponent(Environment)
		.floor.addEventListener('mousedown', event => {
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
	cardJson.Card.meshTypes = [RoundedCornersCard, HSCard];
	let cardData = [];
	const getRandomCard = () => cardData[Math.floor(Math.random() * cardData.length)];
	const getCardById = id => cardData.find(card => card.id === id);
	const addCard = (zone, cardData = getRandomCard()) => {
		const card = entities.createEntity(cardJson);
		zone.attachCard(card);
		zone.insertCard(card);
		const portraitUrl = `http://localhost:9870/portrait/${cardData.id}.jpg`;
		card.hSCard.setPortrait(portraitUrl);
		card.hSCard.setText({title: cardData.name || '', description: cardData.text || ''});
		card.hSCard.setRarity(cardData.rarity);
		card.cardData.json = cardData;
	};
	const handleZoneClick = zone => event => addCard(zone);
	zones.forEach(({collider, cardZone: zone}) => collider.addEventListener('mouseup', handleZoneClick(zone)));
	fetch(urls.cards())
	.then(res=>res.json())
	.then(res=>cardData = res.filter(({type, set, text = ''}) => type === 'MINION' && set === 'GANGS' && text !== ''))
	//.then(cardData=>cardData.slice(0, 3))
	.then(() => {
		console.log('Card data loaded!');
		zones
			.forEach(({collider, zoneData: {kind}, cardZone: zone}) => {
				const kindCounts = {deck: 5, hand: 5, board: 3};
				for(var i = 0; i < kindCounts[kind]; i++) addCard(zone);
			});
		testTargeting(entities);
	});
	//for(var i = 0; i < 20;i++) setTimeout(() => addCard(zones[Math.floor(Math.random() * zones.length)].cardZone), i * 100);
	//testGameApi();
	//testHSCard(entities);
	entities.findComponent(Runtime).start();
};


document.addEventListener('DOMContentLoaded', init);
	
})();