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


const getGlobalAlphaSetter = object3d => {
	const materials = [];
	object3d.traverse(({material}) => {
		if(material) {
			material.transparent = true;
			materials.push({material, opacity: material.opacity});
		}
	});
	return globalAlpha => materials.forEach(({material, opacity}) => material.opacity = opacity * globalAlpha);
};

const arrayUnique = arr => {
	const n = {}, r = [];
	var i = arr.length; while(i--) {
		if (!n[arr[i]]) {
			n[arr[i]] = true; 
			r.push(arr[i]); 
		}
	}
	return r;
};
const escapeRegExp = str=>str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
const shuffleFisherYates = (array) => {
	var m = array.length, t, i;
	while (m) {
		i = Math.floor(Math.random() * m--);
		t = array[m];
		array[m] = array[i];
		array[i] = t;
	}
};

var getTargets = (entities) => {
	const tokens = [];
	var idx = 0;
	const reNumber = /^[0-9]+$/;
	const zones = entities.queryComponents([ZoneData]);
	const kinds = arrayUnique(['any'].concat(zones.map(({zoneData}) => zoneData.kind)));
	const ownerships = ['neutral', 'own', 'foe'];//arrayUnique(zones.map(({zoneData}) => zoneData.ownership));
	const symbols = ['.', ',', '[', ']'];
	const cardPicks = ['first', 'last', 'left', 'right', 'adjacent', 'shuffle', '[0-9]+'];
	const tokenTypes = {
		kind: `(?:${kinds.map(escapeRegExp).join('|')})`,
		ownership: `(?:${ownerships.join('|')})`,
		symbol: `(?:${symbols.map(escapeRegExp).join('|')})`,
		cardPick: `(?:${cardPicks.join('|')})`,
		identifier: '(?:[a-zA-Z0-9\-\_]+)',
	};
	const substitutions = {
		adjacent: '[left, right]'
	};
	const tokenTypeRe = {};
	Object.keys(tokenTypes).forEach(type => tokenTypeRe[type] = new RegExp(tokenTypes[type]));
	const reToken = new RegExp(`\\s*(${Object.keys(tokenTypes).map(type => tokenTypes[type]).join('|')})\\s*`);
	//console.log(reToken);
	const prevToken = () => tokens[idx - 1];
	const currentToken = () => tokens[idx];
	const isNumber = (token = currentToken()) => reNumber.test(token);
	const isType = (type, token) => tokenTypeRe[type] && tokenTypeRe[type].test(currentToken()) && (token === undefined || token === currentToken());
	const isToken = token => token === currentToken();
	const filterZone = (targets = zones, prop, filter = currentToken()) =>
		(filter === 'any')?targets:targets.filter(({zoneData}) => zoneData[prop] === filter);
	const consumeToken = token => (token === undefined || tokens[idx] === token)?tokens[idx++]:false;
	const assertToken = token => {
		if(currentToken() !== token) throw new Error(`Expected token "${token}" but encountered "${currentToken()}" instead.`);
		return consumeToken(token);
	};
	const tokenize = selector => selector.split(reToken).filter(Boolean);
	const getCards = (targets = []) => {
		const cards = [];
		targets.forEach(target => {
			if(target.hasComponent(CardZone)) {
				cards.push.apply(cards, target.cardZone._cards);
			} else if(target.hasComponent(CardData)) {
				cards.push(target);
			}
			else throw new Error(`Invalid target entity:\n${target}`);
		});
		return cards;
	};
	const getZone = target => {
		if(target.hasComponent(CardZone)) return target;
		return zones.find(({cardZone: {_cards}}) => _cards.indexOf(target) !== -1);
	};
	const parseGroupExpression = (targets = []) => {
		assertToken('[');
		const filtered = [];
		do filtered.push.apply(filtered, parseExpression(targets));
		while(consumeToken(','));
		assertToken(']');
		return filtered;
	};
	const parseCardPick = (targets = []) => {
		let cards, cardPos;
		targets = getCards(targets);
		switch(consumeToken()) {
			case 'first': if(targets.length > 0) targets.length = 1; break;
			case 'last': if(targets.length > 0) targets = [targets[targets.length - 1]]; break;
			case 'left':
				cards = getZone(targets[0]).cardZone._cards;
				cardPos = cards.indexOf(targets[0]);
				targets = (cardPos - 1 >= 0)?[cards[cardPos - 1]]:[];
				break;
			case 'right':
				cards = getZone(targets[0]).cardZone._cards;
				cardPos = cards.indexOf(targets[0]);
				targets = (cardPos + 1 <= cards.length - 1)?[cards[cardPos + 1]]:[];
				break;
			case 'shuffle': shuffleFisherYates(targets); break;
			default:
				shuffleFisherYates(targets);
				targets = targets.slice(0, parseInt(prevToken()));
		}
		return targets;
	};
	const parseExpression = (targets = zones) => {
		const targetsStart = [...targets];
		const expressionStart = idx;
		//console.group('parseExpression([%s]); "%s"', targetsStart.map(e=>e.id).join(', '), tokens.slice(expressionStart).join(''));
		if(isType('kind')) targets = filterZone(targets, 'kind', consumeToken());
		else if(isType('ownership')) targets = filterZone(targets, 'ownership', consumeToken());
		else if(isToken('[')) targets = parseGroupExpression(targets);
		else if(isType('cardPick')) targets = parseCardPick(targets);
		else console.error('Unhandled token:', currentToken());
		//console.groupEnd('parseExpression([%s]); "%s"', targetsStart.map(e=>e.id).join(', '), tokens.slice(expressionStart).join(''));
		//console.log('  [%s]."%s" found (%s): %s', targetsStart.map(e=>e.id).join(', '), tokens.slice(expressionStart, idx).join(''), targets.length, targets.map(card=>card.id).join(', '));
		while(consumeToken('.')) targets = parseExpression(targets);
		//console.log('  [%s]."%s" found (%s): %s', targetsStart.map(e=>e.id).join(', '), tokens.slice(expressionStart, idx).join(''), targets.length, targets.map(card=>card.id).join(', '));
		return targets;
	};
	/*
		
		GRAMMAR
		<number> ::= /[0-9]+/
		<card-pick> ::= "first" | "last" | "left" | "right" | "shuffle" | <number>
		<ownership> ::= "neutral" | "own" | "foe"
		<kind> ::= "any" | deck" | "hand" | "board"
		<zone-selector> ::= "any" | <kind> | <ownership>
		<group-expression> ::= <selector> | <selector> "," <group-expression>
		<selector> ::= <zone selector> | "[" <group-expression> "]" | <card-pick>
		<expression> ::= <selector> | <selector> "." <expression>

		//TODO:
			duplicates / uniques
			by card prop value: (cost, name, etc) => [=, <=, >=]
			create new: "all", "new", "rest" ?!
	*/
	return selector => {
		tokens.length = 0;
		tokens.push.apply(tokens, tokenize(selector));
		for(var i = 0; i < tokens.length; i++) {
			if(substitutions[tokens[i]]) {
				Array.prototype.splice.apply(tokens, [i, 1].concat(tokenize(substitutions[tokens[i]])));
			}
		}
		//console.groupCollapsed('getTargets(entities)("%s");', tokens.join(''));
		idx = 0;
		var targets = parseExpression();
		if(idx !== tokens.length) throw new Error(`Tokens left over. Processed ${idx} / ${tokens.length}: ${tokens}`);
		targets = getCards(targets);
		//console.groupEnd('getTargets(entities)("%s");', tokens.join(''));
		return targets;
	};
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
	const handle = entities.findComponent(TransformHandle);
	const mainMenu = entities.createEntity({
		Transform: {position: {x: -8, y: 0, z: -5}},
		Node: {children: [
			{Transform: {position: {x: 0, y: 0, z: 0}}, Button: {label: 'Reset Camera'}},
			{Transform: {position: {x: 0, y: 0, z: 0.7}}, Button: {label: 'Flip Zone Display'}},
		]}
	});
	entities.all.find(({button, text}) => button && text.value === 'Reset Camera')
		.collider.addEventListener('mouseup', event => {
			const orbitCam = entities.findComponent(OrbitCamComponent);
			orbitCam.slideCamera(new Vector3(0, 10.6, 3.7), new Vector3(0, 0, 0.7));
		});
	entities.all.find(({button, text}) => button && text.value === 'Flip Zone Display')
		.collider.addEventListener('mouseup', event => 
			zones.forEach(({zoneData}) => {
				if(zoneData.layout === 'grid') zoneData.layout = 'fan';
				else if(zoneData.layout === 'fan') zoneData.layout = 'grid';
			})
		);
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
	zonesJson.forEach(zoneJson => entities.createEntity(zoneJson).addComponent(Editable));
	//console.log(entities.all.join('\n'));
	console.log(entities.queryComponents([ZoneData]).map(e => e.zoneData).join('\n'));
	const cardJson = {CardData: {type: 1}, Card: {}, CardAnimator: {}};
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
	getTargets = getTargets(entities);
	setTimeout(() => {
		console.log(zones
			.map(({id, zoneData: {kind, ownership}, cardZone: {_cards}}) =>
				`[${id}]${kind}.${ownership} cards: [${_cards.map(card=>card.id).join(', ')}]`)
			.join('\n')
		);
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
			const targets = getTargets(selector);
			console.log('"%s" found (%s) cards: [%s]', selector, targets.length, targets.map(card=>card.id).join(', '));
		});
	}, 500);

	entities.findComponent(Runtime).start();
};


document.addEventListener('DOMContentLoaded', init);
	
})();