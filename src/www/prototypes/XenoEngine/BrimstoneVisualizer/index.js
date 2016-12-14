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
	BallCard, RoundedCornersCard, XACard
} = require('ecsCards');
const {ZoneData, CardZone} = require('ecsZones');
const Environment = require('Environment');
const {targetFactory} = require('cardTargeting');
const {cloneDeep} = require('_');
const {normalizeUVs} = require('GeometryHelpers');


//https://api.hearthstonejson.com/v1/15590/enUS/cards.json
//https://art.hearthstonejson.com/v1/orig/CFM_649.png
const urls = {
	cards: (v = 'v1.15590.pretty') => `http://localhost/data/cards_${v}.json`,
};

const shaders = {
	vertHSCard: `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragHSCard: `
		varying vec2 vUv;
		uniform sampler2D templateTex;
		uniform sampler2D alphaTex;
		uniform vec2 dims;
		uniform float alpha;
		uniform sampler2D backTex; uniform vec2 backDims; uniform vec2 backPos;
		uniform sampler2D portraitTex; uniform vec2 portraitDims; uniform vec2 portraitPos;
		uniform sampler2D rarityTex; uniform vec2 rarityDims; uniform vec2 rarityPos;
		uniform sampler2D titleTex; uniform vec2 titleDims; uniform vec2 titlePos;
		uniform sampler2D gemTex; uniform vec2 gemDims; uniform vec2 gemPos;
		uniform sampler2D attTex; uniform vec2 attDims; uniform vec2 attPos;
		uniform sampler2D hpTex; uniform vec2 hpDims; uniform vec2 hpPos;
		uniform sampler2D textTex; uniform vec2 textDims; uniform vec2 textPos;
		vec4 paint(vec4 canvas, vec4 color) {
			return vec4(canvas.rgb * (1.0 - color.a) + color.rgb * color.a, max(canvas.a, color.a));
		}
		vec4 paintA(vec4 canvas, vec4 color, float alpha) {
			return paint(canvas, vec4(color.rgb, color.a * alpha));
		}
		vec4 clipIcon(vec4 color, vec2 uv) {
			if(uv.x < 0.0 || uv.x > 0.5 || uv.y < 0.0 || uv.y > 0.5) {
				color.a = 0.0;
			}
			return color;
		}
		vec4 getC(sampler2D tex, vec2 texDims, vec2 pos) {
			vec2 uv = vUv * dims + vec2(0.0, -dims.y + texDims.y) + vec2(-pos.x, pos.y);
			vec4 c = texture2D(tex, (uv) / texDims);
			if(uv.y < 0.0 || uv.y > texDims.y || uv.x < 0.0 || uv.x > texDims.x) c.a = 0.0;
			return c;
		}
		void main() {
			vec4 alphaC = texture2D(alphaTex, vUv);
			vec4 cardC = vec4(0.0, 0.0, 0.0, 0.0);
			//vec4 cardC = vec4(1.0, 1.0, 1.0, 1.0);
			//cardC = paint(cardC, getC(templateTex, vec2(764.0, 1100.0), vec2(0.0, 0.0)));
			//cardC = paintA(cardC, getC(backTex, backDims, backPos), alpha);
			//cardC = paintA(cardC, getC(rarityTex, rarityDims, rarityPos), alpha);
			cardC = paint(cardC, vec4(getC(backTex, backDims, backPos).rgb, alphaC.g));
			cardC = paint(cardC, vec4(getC(portraitTex, portraitDims, portraitPos).rgb, alphaC.r));
			cardC = paint(cardC, getC(rarityTex, rarityDims, rarityPos));
			cardC = paint(cardC, getC(titleTex, titleDims, titlePos));
			cardC = paint(cardC, getC(gemTex, gemDims, gemPos));
			cardC = paint(cardC, getC(attTex, attDims, attPos));
			cardC = paint(cardC, getC(hpTex, hpDims, hpPos));
			cardC = paint(cardC, getC(textTex, textDims, textPos));
			//if(cardC.r < 0.2) discard;
			gl_FragColor = cardC;
		}
	`,
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
	}
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
			console.log('"%s" found (%s) cards: [%s]', selector, targets.length, targets.map(card=>card.id).join(', '));
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

class FontLoader {
	constructor() {
		this.cache = {};
	}
	waitForFont({url, family, style = 'normal', weight = 'normal', timeout = 100, interval = 5}) {
		new Promise((resolve, reject) => {
			const ctx = document.createElement('canvas').getContext('2d');
			ctx.font = weight+' '+style+' 60px "'+family+'"';
			const startWidth = ctx.measureText('1').width;
			const timeoutId = setTimeout(() => {
				//console.log('timeout!');
				clearTimeout(timeoutId);
				clearInterval(intervalId);
				reject(new Error('Font loading timed out for \''+ctx.font+'\''));
			}, timeout);
			const intervalId = setInterval(() => {
				const width = ctx.measureText('W').width;
				//console.log('interval!', width, startWidth);
				if(width !== startWidth) {
					clearTimeout(timeoutId);
					clearInterval(intervalId);
					resolve();
				}
			}, interval);
		});
	}
	loadFont({url, family, style, weight}) {
		return Promise.resolve()
		.then(res => {
			console.info('CHECKING FONT ', url, family, style, weight);
			return waitForFont({url, family, style, weight, timeout: 50, interval: 50})
			.then((res) => console.log('waitForFont.then', res))
			.catch((err) => console.log('waitForFont.catch', err));
		})
		.then(res => fetch(url))
		.then(res => res.blob())
		.then(res => {
			const blobUrl = window.URL.createObjectURL(res);
			const format = 'woff';
			const tag = document.createElement('style');
			tag.type = 'text/css';
			tag.rel = 'stylesheet';
			tag.innerHTML = '@font-face {\n'+
				'font-family: "'+family+'";\n'+
				'font-style: '+style+';\n'+
				'font-weight: '+weight+';\n'+
				'src: url('+blobUrl+') format("'+format+'");\n'+
			'}';
			document.getElementsByTagName('head')[0].appendChild(tag);
		});
	}
	load(font) {
		const cacheKey = this.getKey(font);
		if(!this.cache[cacheKey]) this.cache[cacheKey] = this.loadFont(font);
		return this.cache[cacheKey];
	}
	getKey(font) {
		return JSON.stringify(font);
	}
}



const getProp = prop => item => item[prop];
const joinParts = parts => parts.reduce((s, cur, idx, arr) => s+(arr[idx-1] && arr[idx-1].br?' ':'')+cur.s, '');
const textToWords = text => text.replace(/([\s])/g, '|').split('|');
const wordsToTags = (br, style) => word => ({s: word, br: br, style: style});
function tagText(ctx, styleFonts, text) {
	var formats = [
		{l: '[', r: ']', style: 'bold', canBreak: false},
		{l: '*', r: '*', style: 'bold', canBreak: true},
		{l: '<b>', r: '</b>', style: 'bold', canBreak: true},
		{l: '#', r: '#', style: 'italic', canBreak: true},
		{l: '<i>', r: '</i>', style: 'italic', canBreak: true},
	];
	formats.forEach(function(format) {
		var l = format.l;
		var r = format.r;
		format.reTest = new RegExp(`^\\${l}[^\\${r[0]}]*\\${r}$`);
		format.reReplace = new RegExp(`^\\${l}([^\\${r[0]}]*)\\${r}$`);
		format.reStr = '\\'+l+'[^\\'+r+']+\\'+r;
	});
	var reWhiteSpace = /[\s\t]+/g;
	var reSpace = /[\s]/;
	var reSplit = new RegExp('('+
		formats.map(function(format) {return '(?:'+format.reStr+')';}).join('|')+
	')', 'g');
	var reBoldTest = /(\[[^\]]+\])/;
	var reBoldToText = /^\[([^\]]+)\]$/;
	text = text.replace(reWhiteSpace, ' ');
	var taggedParts = [].concat.apply([],
		text.split(reSplit).map(function(str) {
			var i = formats.length; while(i--) {
				if(formats[i].reTest.test(str)) {
					str = str.replace(formats[i].reReplace, '$1');
					// Return styled part
					if(formats[i].canBreak === false) {
						return {s: str, br: false, style: formats[i].style};
					} else {
						return str.split(reSpace).map(wordsToTags(true, formats[i].style));
					}
				}
			}
			// Return unstyled parts
			return str.split(reSpace).map(wordsToTags(true, 'normal'));
		})
	);
	// Remove blank segments
	var i = taggedParts.length; while(i--) {
		var part = taggedParts[i];
		if(part.s === '') {
			if(i > 0) taggedParts[i-1].br = part.br || taggedParts[i-1].br;
			taggedParts.splice(i, 1);
		} else {
			ctx.font = styleFonts[part.style];
			part.w = ctx.measureText(part.s).width;
		}
	}
	return taggedParts;
}
function calculateLineMetrics(ctx, fonts, text, lineWidths) {
	console.info('calculateLineMetrics(ctx, "%s", lineWidths);', text);
	function getLineBreak(taggedText, spaceWidth, start, maxWidth) {
		//console.info('getLineBreak(taggedText, spaceWidth, %s, %s);', start, maxWidth);
		let i, width = 0;
		for(i = start; i < taggedText.length; i++) {
			width += taggedText[i].w;
			//console.log(i, width, maxWidth, taggedText[i]);
			if(taggedText[i].br) {
				if(width > maxWidth) {
					//console.log(i, width, maxWidth, width > maxWidth);
					do {i--;} while(i > 0 && taggedText[i].br === false);
					//console.log(i);
					//console.log('return i > i=', i);
					return i;
				}
				width += spaceWidth;
			}
		}
		//console.log('return i-1 > i=', i);
		return i-1;
	}
	function getLineWidth(taggedText, spaceWidth, start, end) {
		//console.log('getLineWidth(taggedText, spaceWidth, %s, %s, %s)', start, end, taggedText.slice(start, end+1).map(getProp('s')));
		return -spaceWidth+taggedText
			.slice(start, end+1)
			.map(getProp('w'))
			.reduce(function(pv, cv) { return pv + cv + spaceWidth; }, 0);
	}
	function calculateBreaks(taggedText, spaceWidth, lineWidths) {
		const breaks = [];
		let start = 0, end = 0, lineW;
		for(let i = 0; i < lineWidths.length; i++) {
			end = getLineBreak(taggedText, spaceWidth, start, lineWidths[i]);
			lineW = getLineWidth(taggedText, spaceWidth, start, end);
			breaks.push(end);
			start = end+1;
		}
		return breaks;
	}
	const styleFonts = {
		normal: fonts.font,
		bold: fonts.fontBold,
		italic: fonts.fontItalic,
	};
	const options = [
		{ widths: [520], scaleX: 1, scaleY: 1},
		{ widths: [520, 520], scaleX: 1, scaleY: 1},
		{ widths: [520, 520, 420], scaleX: 1, scaleY: 1},
		{ widths: [510, 510, 420], scaleX: 0.9, scaleY: 0.9},
		{ widths: [510, 510, 420], scaleX: 0.78, scaleY: 0.8},
		{ widths: [510, 510, 420], scaleX: 0.78, scaleY: 0.8},
		{ widths: [510, 510, 420], scaleX: 0.75, scaleY: 0.75},
		{ widths: [510, 510, 420], scaleX: 0.70, scaleY: 0.75},
		{ widths: [510, 510, 460, 400], scaleX: 0.9, scaleY: 0.9},
		{ widths: [510, 510, 480, 400], scaleX: 0.8, scaleY: 0.8},
		{ widths: [510, 510, 480, 400], scaleX: 0.75, scaleY: 0.75},
		{ widths: [510, 510, 510, 460, 400, 100000], scaleX: 0.9, scaleY: 0.9},
	];
	const taggedText = tagText(ctx, styleFonts, text);
	const spaceWidth = ctx.measureText(' ').width;
	console.log('text:', text);
	console.log('taggedText:', taggedText.map(({s, br, w}) => `${s} (${br}, ${Math.round(w)})`));
	let i, breaks, solution;
	for(i = 0; i < options.length; i++) {
		//console.log('\nTry option %s:', i, options[i].widths);
		breaks = calculateBreaks(taggedText, spaceWidth, options[i].widths);
		//console.log('breaks:', breaks, breaks[breaks.length-1], taggedText.length-1);
		if(breaks[breaks.length-1] >= taggedText.length-1) {
			solution = i;
			break;
		}
	}
	console.log('solution:', solution);
	var x = 512, y = 463, lineHeight = 60;
	var widths = options[solution].widths;
	ctx.translate(x, y);
	ctx.scale(options[solution].scaleX, options[solution].scaleY);
	ctx.translate(-x, -y);
	ctx.textAlign = 'left';
	ctx.fillStyle = 'rgba(0,0,0,1)';
	var start = 0, end = 0;
	var lineY = y - ((widths.length-1) * lineHeight) / 2;
	for(i = 0; i < widths.length; i++) {
		//ctx.strokeStyle = 'rgba(0,0,0,0.6)';
		//ctx.strokeRect(x - widths[i] / 2, lineY - lineHeight/2, widths[i], lineHeight);
		end = breaks[i];
		var spaceW = spaceWidth;
		var lineW = getLineWidth(taggedText, spaceWidth, start, end);
		var lineX = x - lineW / 2;
		//console.log('[%s,%s] "%s"', start, end, joinParts(taggedText.slice(start, end+1)));
		taggedText.slice(start, end + 1)
		.forEach(part => {
			//ctx.fillStyle = 'rgba(0,0,0,1)';
			ctx.font = styleFonts[part.style];
			ctx.fillText(part.s, lineX, lineY);
			//ctx.strokeStyle = 'rgba(255,0,0,0.8)';
			//ctx.strokeRect(lineX, lineY - lineHeight/2, part.w, lineHeight);
			lineX += part.w + (part.br?spaceW:0);
		});
		lineY += lineHeight;
		start = end + 1;
	}
}

function setStyle(ctx, style) {
	Object.keys(style).forEach(function(key) {
		//if(key == 'font') console.log('style[%s] \'%s\' -> \'%s\'', key, ctx[key], style[key]);
		ctx[key] = style[key];
	});
}
function renderMultilineText(ctx, text, x, y, style, lineHeight, lineWidths) {
	if(text === '') return;
	setStyle(ctx, style);
	calculateLineMetrics(ctx, style, text, lineWidths);
}
function drawDescription(ctx, description) {
	//ctx.translate(w/2, 0);
	//ctx.scale(0.95, 1);
	//ctx.translate(-w/2, 0);
	var descriptionStyle = {};
	renderMultilineText(ctx, description, 168, 334, descriptionStyle, 20, [226, 222, 190, 180, 180, 180]);
}

const {Vector2, MeshPhongMaterial, BoxGeometry, Mesh, TextureLoader} = THREE;
class HSCard extends CardMesh {
	constructor() {
		super();
		this.textTitle = '';
		this.textDescription = '';
	}
	loadFonts(fonts) {
		const cssFontLoader = this.entities.findComponent('CSSFontLoaderComponent');
		this.fonts = Promise.all(fonts.map(font => cssFontLoader.load(font)));
		return this.fonts;
	}
	renderCardText(canvas) {
		const {textTitle: title, textDescription: description} = this;
		const ctx = canvas.getContext('2d');
		const titleFont = {
			url: '/fonts/Belwe_Bd_BT_bold.woff',
			family: 'Belwe',
			style: 'normal',
			weight: 'bold'
		};
		const descriptionFontReg = {
			url: '/fonts/ITCFranklinGothicStd-MdCd.woff',
			family: 'FranklinGothic',
			style: 'normal',
			weight: 'normal'
		};
		const descriptionFontBold = {
			url: '/fonts/ITCFranklinGothicStd-DmCd.woff',
			family: 'FranklinGothic',
			style: 'normal',
			weight: 'bold'
		};
		return this.loadFonts([titleFont, descriptionFontReg, descriptionFontBold])
		.then(res => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			var font;
			font = titleFont;
			ctx.fillStyle = 'white';
			//ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.font = `${font.style} ${font.weight} 65px ${font.family}`;
			//ctx.shadowOffsetX = 0;
			//ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 20;
			ctx.shadowColor = 'black';
			ctx.fillText(title, canvas.width / 2, canvas.height / 2 + -6 * 48);
			ctx.fillStyle = 'black';
			ctx.lineWidth = '3';
			ctx.strokeText(title, canvas.width / 2, canvas.height / 2 + -6 * 48);
			ctx.fillStyle = 'black';
			ctx.shadowBlur = 0;
			//font = descriptionFont;
			//ctx.font = `${font.style} ${font.weight} 48px ${font.family}`;
			//ctx.fillText('Battlecry: Discover a', canvas.width / 2, canvas.height / 2 + -1 * 48);
			//ctx.fillText('Mage, Priest, or Warlock', canvas.width / 2, canvas.height / 2 + 0 * 48);
			//ctx.fillText('card.', canvas.width / 2, canvas.height / 2 + 1 * 48);

			const descriptionStyle = {
				font: `normal 60px FranklinGothic`,
				fontBold: `bold 60px FranklinGothic`,
				fontItalic: `italic 60px FranklinGothic`,
				//font: '40px "Proxima Nova Cn Rg"',
				//fontBold: 'bold 40px "Proxima Nova Cn Rg"',
				//fontItalic: 'italic 40px "Proxima Nova Cn Rg"',
				textAlign: 'center', textBaseline: 'middle',
				lineWidth: 0, strokeStyle: 'transparent',
				fillStyle: 'black',
			};
			const lineWidths = [226, 222, 190, 180, 180, 180];
			//console.log(calculateLineMetrics(ctx, descriptionStyle, description, lineWidths));
			renderMultilineText(ctx, description, 512, 334, descriptionStyle, 100, lineWidths);

			//ctx.fillText(description, canvas.width / 2, canvas.height / 2 + 0 * 48);
			//canvasTex.magFilter = THREE.LinearMipmapLinearFilter;
			//canvasTex.minFilter = THREE.LinearMipmapLinearFilter;
			this.textTexture.needsUpdate = true;
		});
	}
	OnAttachComponent(entity) {
		//super.OnAttachComponent(entity);
		const renderer = this.entities.findComponent('Renderer');
		const textureLoader = this.entities.findComponent('TextureLoaderComponent');
		const {width, height, thickness} = this;
		//const cornerRadius = 0.2;
		//const shape = makeRoundedRectShape(0, 0, width, height, cornerRadius);
		//const geometry = new ExtrudeGeometry(shape, {amount: thickness, bevelEnabled: false, steps: 1});
		const geometry = new BoxGeometry(1, 1, 1);
		//geometry.rotateX(0.5 * Math.PI);
		//geometry.translate(0, thickness, 0);
		/*
			const material = new MeshPhongMaterial({
				transparent: true,
				depthWrite: false,
				//depthTest: false,
				map: textureLoader.load('/sunwell/mNeutral.png')
				//map: textureLoader.load('https://art.hearthstonejson.com/v1/256x/OG_024.jpg')
				//map: textureLoader.load('/hsart/OG_024.jpg')
			});
			//https://art.hearthstonejson.com/v1/256x/OG_024.jpg
		*/
		const canvas = document.createElement('canvas');
		this.textTexture = new THREE.Texture(canvas);
		canvas.width = 1024;
		canvas.height = 1024;
		this.textCanvas = canvas;
		//this.setTitle('Kabal Courier');
		/*
			//font: '32px "Proxima Nova Cn Rg"',
			//textAlign: 'center', textBaseline: 'middle',
			//lineWidth: 4, strokeStyle: 'black',
			//fillStyle: 'white',
			//maxWidth: 250
			const img = new Image();
			img.onload = function() {
				ctx.drawImage(img, 0, 0, 512, 512);
				canvasTex.needsUpdate = true;
			};
			//img.src = '/images/testuv.jpg';
			img.src = '/hsart/CFM_649.png';
		*/
		const textures = {
			template: textureLoader.load('/hsart/mNeutral_2.jpg'),
			framesAlpha: textureLoader.load('/hsart/framesAlpha.png'),
			back: textureLoader.load('/hsart/mNeutral.jpg'),
			//back: new THREE.Texture(canvas),
			//back: textureLoader.load('/images/testuv.jpg'),
			//portrait: textureLoader.load('/hsart/OG_024.jpg'),
			portrait: textureLoader.load('/hsart/CFM_649.jpg'),
			gem: textureLoader.load('/hsart/gem.png'),
			att: textureLoader.load('/hsart/attack.png'),
			hp: textureLoader.load('/hsart/health.png'),
			title: textureLoader.load('/hsart/title.png'),
			rarity: undefined,
			//rarity: textureLoader.load('/hsart/rarity-rare.png'),
			//portrait: textureLoader.load('/images/testuv.jpg'),
			//portrait: canvasTex,
			//portrait: textureLoader.load('/images/uv_checker.png'),
			text: this.textTexture,
		};
		/*
		Object.keys(textures).forEach(name => {
			const texture = textures[name];
			//texture.magFilter = THREE.LinearMipmapLinearFilter;
			//texture.minFilter = THREE.LinearMipmapLinearFilter;
		});
		*/
		const uniforms = {
			templateTex: {type: 't', value: textures.template},
			alphaTex: {type: 't', value: textures.framesAlpha},
			textTex: {type: 't', value: textures.text},
			dims: {type: 'v2', value: new Vector2(764, 1100)},
			alpha: {type: 'f', value: 0.5},
		};
		const overlays = [
			{name: 'back', dims: {x: 764, y: 1100}, pos: {x: 0, y: 0}},
			{name: 'portrait', dims: {x: 585, y: 585}, pos: {x: 103, y: 79}},
			{name: 'rarity', dims: {x: 146, y: 146}, pos: {x: 327, y: 608}},
			{name: 'title', dims: {x: 618, y: 154}, pos: {x: 88, y: 543}},
			{name: 'gem', dims: {x: 184, y: 182}, pos: {x: 23, y: 82}},
			{name: 'att', dims: {x: 214, y: 238}, pos: {x: -2, y: 864}},
			{name: 'hp', dims: {x: 167, y: 218}, pos: {x: 586, y: 883}},
			{name: 'text', dims: {x: 1024, y: 1024}, pos: {x: -0.5 * (1024-764), y: 400}},
		];
		overlays.forEach(({name, dims, pos}) => {
			uniforms[name+'Tex'] = {type: 't', value: textures[name]};
			uniforms[name+'Dims'] = {type: 'v2', value: dims};
			uniforms[name+'Pos'] = {type: 'v2', value: pos};
		});
		/*
			back: 764 x 1100
			portrait: 512 x 512
			ratio; 1.28125 x 2.1484375
			padding-left: 72/764
			205/160 = 1.28125
			290/160 = 1.8125
			body 192x136
			face 106x106
			205x290
			160x161
			x: 22.656, 22.672
			y: 17.391, 111.138
			22.656 + 22.672 + 160 = 205.328
			17.391 + 111.138 + 161 = 289.529
			ratio 3.2
			764x1100
			body: 656x928
			portrait: 512x512
			padding-x: 72.4992, 72.5504
			padding-y: 55.6512, 355.6416
			padding-left: 72
			padding-right: 72
			padding-top: 55.65
			padding-bottom: 355.6
			ratio: 1.18534482759 / 1.16463414634: 1.185
		*/
		const material_shh = new THREE.ShaderMaterial({
			transparent: true,
			depthWrite: false,
			depthTest: false,
			side: THREE.FrontSide,
			uniforms: uniforms,
			vertexShader: shaders.vertHSCard,
			fragmentShader: shaders.fragHSCard,
		});
		document.body.addEventListener('keypress', event => {
			const {rarityPos: pos, rarityDims: dims, alpha} = material_shh.uniforms;
			switch(event.key) {
				case '+':
					dims.value.x += 1;
					dims.value.y += 1;
					break;
				case '-':
					dims.value.x += -1;
					dims.value.y += -1;
					break;
				case 'w': pos.value.y += -1; break;
				case 'a': pos.value.x += -1; break;
				case 's': pos.value.y +=  1; break;
				case 'd': pos.value.x +=  1; break;
				case ' ': alpha.value = (alpha.value < 1)?1: 0.0; break;
			}
			console.log('p: %s / %s d: %s / %s a: %s',
				pos.value.x,  pos.value.y,
				dims.value.x,  dims.value.y,
				alpha.value
			);
		});
		Mesh.call(this, geometry, material_shh);
		super.OnAttachComponent(entity);
		normalizeUVs(this.geometry,
			new Vector2(-0.5,-0.5),
			new Vector2( 0.5, 0.5),
			new Vector2(0, 0)
		);
		this.geometry.rotateX(-0.5 * Math.PI);
		this.geometry.scale(width, thickness, height);
		geometry.translate(0, thickness, 0);
		entity.collider.material.visible = false;
	}
	setPortrait(url) {
		//console.info('setPortrait("%s")', url);
		const textureLoader = this.entities.findComponent('TextureLoaderComponent');
		this.material.uniforms.portraitTex.value = textureLoader.load(url);
	}
	setText({title = this.textTitle, description = this.textDescription}) {
		//console.info('setText({title, description})', title, description);
		this.textTitle = title;
		this.textDescription = description
			.replace(/^\[x\]/, '')
			.replace(/\{[0-9]\}/igm, '1')
			;
		return this.renderCardText(this.textCanvas);
	}
	setTitle(title) {
		//console.info('setTitle("%s")', title);
		this.textTitle = title;
		return this.renderCardText(this.textCanvas);
	}
	setDescription(description) {
		//console.info('setDescription("%s")', description);
		this.textDescription = description;
		return this.renderCardText(this.textCanvas);
	}
	setRarity(rarity) {
		//console.info('setRarity("%s")', rarity);
		const textureLoader = this.entities.findComponent('TextureLoaderComponent');
		const rarityUrls = {
			COMMON: '/hsart/rarity-common.png',
			EPIC: '/hsart/rarity-epic.png',
			LEGENDARY: '/hsart/rarity-legendary.png',
			RARE: '/hsart/rarity-rare.png',
		};
		this.material.uniforms.rarityTex.value = rarityUrls[rarity]?textureLoader.load(rarityUrls[rarity]):undefined;
	}
}

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
	let cardData;
	const addCard = zone => {
		const card = entities.createEntity(cardJson);
		zone.attachCard(card);
		zone.insertCard(card);
		if(cardData) {
			const rndCard = cardData[Math.floor(Math.random() * cardData.length)];
			console.log(rndCard);
			const portraitUrl = `http://localhost:9870/portrait/${rndCard.id}.jpg`;
			//console.log('portraitUrl:', portraitUrl);
			card.hSCard.setPortrait(portraitUrl);
			card.hSCard.setText({title: rndCard.name || '', description: rndCard.text || ''});
			card.hSCard.setRarity(rndCard.rarity);
		}
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
				const kindCounts = {deck: 0, hand: 1, board: 1};
				for(var i = 0; i < kindCounts[kind]; i++) addCard(zone);
			});
		/*
		cards.forEach(card => {
			const rndCard = cardData[Math.floor(Math.random() * cardData.length)];
			console.log(rndCard);
			const portraitUrl = `http://localhost:9870/portrait/${rndCard.id}.jpg`;
			console.log('portraitUrl:', portraitUrl);
			card.setPortrait(portraitUrl);
		});
		*/
	});
	//for(var i = 0; i < 20;i++) setTimeout(() => addCard(zones[Math.floor(Math.random() * zones.length)].cardZone), i * 100);
	//testTargeting(entities);
	//testGameApi();

	//testHSCard(entities);

	entities.findComponent(Runtime).start();
};


document.addEventListener('DOMContentLoaded', init);
	
})();