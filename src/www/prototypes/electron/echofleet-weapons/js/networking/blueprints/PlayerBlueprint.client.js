(function() {
'use strict';

var assetdata = require('assetdata');
var DragAndDrop = require('DragAndDrop');
var CardGlow = require('CardGlow');

var cardInfo = assetdata.cardInfo;
var cardBoardZ = cardInfo.boardZ;
var cardDragZ = cardInfo.dragZ;
var cardDragProxyZ = cardInfo.dragProxyZ;


var blueprint = {
	name: 'PlayerBlueprint',
	getCard: function(id) {
		var cards = this.context.game.cards;
		for(var i = 0, l = cards.length; i < l; i++) {
			var card = cards[i];
			if(card.cardId === id) return card;
		}
		return false;
	},
	OnCreateClient: function() {
		console.info('PlayerBlueprint.client.OnCreateClient();');
		var self = this;
		var netId = this.netId;
		var app = this.context.app;
		var materials = this.context.materials;
		var scene = app.scene;
		var mouseHandler = app.mouseHandler;
		var dragAndDrop = new DragAndDrop({app: app, dropZ: cardBoardZ, dragZ: cardDragZ});
		dragAndDrop.attachToMouseHandler(mouseHandler);
		mouseHandler.on('add', function(obj) {
			if(obj.name === 'card.collider') {
				var card = obj.parent;
				dragAndDrop.attachCard(card);
			}
		});
		var clientGlow = new CardGlow(materials.createGlowFlowMaterial());
		//scene.add(clientGlow);
		var proxyGlow = new CardGlow(materials.createGlowFlowMaterial());
		//scene.add(proxyGlow);
		var hoverCard;
		var cardGlowListeners = {
			mouseenter: function() {
				this.hover();
				netId.send({event: 'hover', card: this.cardId});
			},
			mouseleave: function() {
				this.unhover();
				netId.send({event: 'unhover', card: this.cardId});
			},
			lifted: function() {
				netId.send({event: 'lift', card: this.cardId, target: dragAndDrop.dropTarget});
			},
			drag: function() {
				netId.send({event: 'drag', card: this.cardId, target: dragAndDrop.dropTarget});
			},
			dragfinish: function() {
				netId.send({event: 'drop', card: this.cardId, target: dragAndDrop.dropTarget});
			},
		};
		function attachCard(card) {
			if(typeof card.hover === 'function') return;
			card.hover = function(isProxy) {
				if(isProxy !== true) {
					if(this.cardId === hoverCard) return;
					hoverCard = this.cardId;
					//console.log('card(CLIENT).hover:', hoverCard, this.cardId, isProxy);
					//clientGlow.position.copy(this.position);
					this.mesh.add(clientGlow);
					clientGlow.hover();
				} else {
					//console.log('card(PROXY).hover:', hoverCard, this.cardId, isProxy);
					//proxyGlow.position.copy(this.position);
					this.mesh.add(proxyGlow);
					proxyGlow.hoverProxy();
				}
			};
			card.unhover = function(isProxy) {
				if(isProxy !== true) {
					//console.log('card(CLIENT).unhover:', hoverCard, this.cardId, isProxy);
					if(this.cardId !== hoverCard) return;
					hoverCard = undefined;
					clientGlow.unhover();
					clientGlow.remove();
				} else {
					proxyGlow.unhover();
					proxyGlow.remove();
				}
			};
			card.lift = function(dropTarget) {
				var target = new THREE.Vector3().copy(dropTarget);
				var deltaVector = target.clone();
				deltaVector.z = cardDragProxyZ;
				deltaVector.sub(this.position);
				//console.info('deltaVector:', deltaVector.toString());
				this.position.add(deltaVector);
				this.animateVector(deltaVector);
			};
			card.drag = function(dropTarget) {
				var target = new THREE.Vector3().copy(dropTarget);
				var deltaVector = target.clone();
				deltaVector.z = cardDragProxyZ;
				deltaVector.sub(this.position);
				if(deltaVector.length() > 0.01) {
					//console.info(' drag > deltaVector:', deltaVector.toString(), deltaVector.length());
					this.position.add(deltaVector);
					this.animateVector(deltaVector, false);
				}
			};
			card.drop = function(dropTarget) {
				console.info('card.drop(dropTarget);');
				var target = new THREE.Vector3().copy(dropTarget);
				var deltaVector = target.clone();
				deltaVector.z = cardBoardZ;
				deltaVector.sub(this.position);
				//console.info(' drop > deltaVector:', deltaVector.toString(), deltaVector.length());
				this.position.add(deltaVector);
				this.animateVector(deltaVector);
			};
			card.abortdrag = function(position) {
				console.info('card.abortdrag(%s);', JSON.stringify(position));
				//console.log('ABORT DRAG!', self.peerType);

				var target = new THREE.Vector3().copy(position);
				var deltaVector = target.clone();
				deltaVector.z = cardBoardZ;
				deltaVector.sub(this.position);
				this.position.add(deltaVector);
				this.animateVector(deltaVector);
			};
			card.addEventListeners(cardGlowListeners);
		}
		dragAndDrop.on('cardattached', attachCard);
		//this.dispatchEvent('test', 'OnCreateClient '+this.peerType);
		scene.children
			.filter(function(obj) { return obj.name === 'card'; })
			.forEach(attachCard);

		this.netId.on('msg', function(msg) {
			//console.log('MSG[%s]:', self.peerType, msg.event, msg.card);
			var card = self.getCard(msg.card);
			if(card) {
				switch(msg.event) {
					case 'abortdrag': card.abortdrag(msg.position); break;
					default: console.error(msg);
				}
			}
		});
	},
	OnCreateProxy: function() {
		console.info('PlayerBlueprint.client.OnCreateProxy();');
		//this.dispatchEvent('test', 'OnCreateProxy '+this.peerType);
		var self = this;
		var app = this.context.app;
		var materials = this.context.materials;
		var scene = app.scene;
		this.netId.on('msg', function(msg) {
			//console.log('MSG[%s]:', self.peerType, msg.event, msg.card);
			console.log('MSG: %s', JSON.stringify(msg));
			var card = self.getCard(msg.card);
			if(card) {
				if(typeof card.hover !== 'function') {
					console.error('No card.hover function found on card');
					console.log('card ID:', msg.card);
					console.log(JSON.stringify(msg));
					console.log(Object.keys(card));
					console.log(card);
				}
				switch(msg.event) {
					case 'hover': card.hover(true); break;
					case 'unhover': card.unhover(true); break;
					case 'lift': card.lift(msg.target); break;
					case 'drag': card.drag(msg.target); break;
					case 'drop': card.drop(msg.target); break;
					case 'abortdrag': card.abortdrag(msg.position); break;
					default: console.error(msg);
				}
			}
		});
	},
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();