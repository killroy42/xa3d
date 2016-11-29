(() => {

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

const targetFactory = (defaultTargets) => {
	const reNumber = /^[0-9]+$/;
	const tokens = [];
	var idx = 0;
	const prevToken = () => tokens[idx - 1];
	const currentToken = () => tokens[idx];
	const isToken = token => token === currentToken();
	const consumeToken = token => (token === undefined || currentToken() === token)?tokens[idx++]:false;
	const assertToken = token => {
		if(currentToken() !== token) throw new Error(`Expected token "${token}" but encountered "${currentToken()}" instead.`);
		return tokens[idx++];
	};
	const symbolTable = {
		symbol: ['.', ',', '[', ']'],
		cardPick: ['first', 'last', 'left', 'right', 'adjacent', 'shuffle', '[0-9]+'],
		'zoneData.kind': ['any', 'deck', 'hand', 'board'],
		'zoneData.ownership': ['neutral', 'own', 'foe'],
		'cardData.hp': ['[0-9]+'],
	};
	const substitutions = {
		adjacent: '[left, right]'
	};
	const createPropertyFilter = (component, prop) => (targets, filter = currentToken()) => {
		if(filter === 'any') return targets;
		return targets.filter(target => target[component][prop] === filter);
	};
	const types = Object.keys(symbolTable);
	const zones = [];
	const tokenTypeRe = {};
	const allSymbols = [];
	const propertyFilters = {};
	types.forEach(type => {
		const symbols = symbolTable[type].map(sym=>(sym.length === 1)?escapeRegExp(sym):sym);
		allSymbols.push.apply(allSymbols, symbols);
		tokenTypeRe[type] = new RegExp(`(?:${symbols.join('|')})`);
		if(type.indexOf('.') !== -1) {
			propertyFilters[type] = createPropertyFilter.apply(this, type.split('.'));
		}
	});
	const reToken = new RegExp(`\\s*(${allSymbols.join('|')})\\s*`);
	const tokenize = selector => selector.split(reToken).filter(Boolean);
	Object.keys(substitutions).forEach(key => substitutions[key] = tokenize(substitutions[key]));
	const isNumber = (token = currentToken()) => reNumber.test(token);
	const isType = (type, token) => tokenTypeRe[type] && tokenTypeRe[type].test(currentToken()) && (token === undefined || token === currentToken());
	const parseGroupExpression = (targets = []) => {
		assertToken('[');
		const filtered = [];
		do filtered.push.apply(filtered, parseExpression(targets));
		while(consumeToken(','));
		assertToken(']');
		return filtered;
	};
	const getCardsOfTarget = target => {
		if(target.cardData !== undefined) return [target];
		if(target.cardZone !== undefined) return target.cardZone.getCards();
		throw new Error(`Invalid target: ${target}`);
	};
	const getCardsOfTargets = (targets = []) => {
		return Array.prototype.concat.apply([], targets.map(getCardsOfTarget));
	};
	const getZoneOfTarget = target => {
		if(target.cardZone !== undefined) return target;
		return zones.find(({cardZone}) => cardZone.getCards().indexOf(target) !== -1);
	};
	const parseCardPick = (targets = []) => {
		let cards, cardPos;
		targets = getCardsOfTargets(targets);
		switch(consumeToken()) {
			case 'first': if(targets.length > 0) targets.length = 1; break;
			case 'last': if(targets.length > 0) targets = [targets[targets.length - 1]]; break;
			case 'left':
				cards = getZoneOfTarget(targets[0]).cardZone.getCards();
				cardPos = cards.indexOf(targets[0]);
				targets = (cardPos - 1 >= 0)?[cards[cardPos - 1]]:[];
				break;
			case 'right':
				cards = getZoneOfTarget(targets[0]).cardZone.getCards();
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
		let tokenProcessed = false;
		if(isType('symbol')) {
			if(isToken('[')) {
				tokenProcessed = true;
				targets = parseGroupExpression(targets);
			}
		}
		else if(isType('cardPick')) {
			tokenProcessed = true;
			targets = parseCardPick(targets);
		}
		else {
			types
				.filter(type => isType(type))
				.forEach(type => {
					if(tokenProcessed) return;
					tokenProcessed = true;
					targets = propertyFilters[type](targets, consumeToken());
				});
		}
		if(!tokenProcessed) throw new Error(`Unexpected token: ${currentToken()}`);
		//console.groupEnd('parseExpression([%s]); "%s"', targetsStart.map(e=>e.id).join(', '), tokens.slice(expressionStart).join(''));
		//console.log('  [%s]."%s" found (%s): %s', targetsStart.map(e=>e.id).join(', '), tokens.slice(expressionStart, idx).join(''), targets.length, targets.map(card=>card.id).join(', '));
		while(consumeToken('.')) targets = parseExpression(targets);
		//console.log('  [%s]."%s" found (%s): %s', targetsStart.map(e=>e.id).join(', '), tokens.slice(expressionStart, idx).join(''), targets.length, targets.map(card=>card.id).join(', '));
		return targets;
	};
	return (targets = defaultTargets, selector) => {
		zones.length = 0;
		zones.push.apply(zones, targets);
		tokens.length = 0;
		tokens.push.apply(tokens, tokenize(selector));
		for(var i = 0; i < tokens.length; i++) {
			if(substitutions[tokens[i]]) {
				Array.prototype.splice.apply(tokens, [i, 1].concat(substitutions[tokens[i]]));
			}
		}
		idx = 0;
		targets = parseExpression(targets);
		if(idx !== tokens.length) throw new Error(`Tokens left over. Processed ${idx} / ${tokens.length}: ${tokens}`);
		targets = getCardsOfTargets(targets);
		return targets;
	};
};


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		targetFactory,
	};
	module.exports.cardTargeting = module.exports;
}
})();