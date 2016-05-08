(function() {
var THREE = require('enhanceTHREE')(require('THREE'));
var io = require('lookup');
var THREEPrototype = require('THREEPrototype');
var MouseHandler = require('MouseHandler');
var MouseCursor = require('MouseCursor');
var ControlsSwitcher = require('ControlsSwitcher');
var DragAndDrop = require('DragAndDrop');
var initLights = require('initLights');
var createBoard = require('createBoard');
var XenoCard = require('XenoCard');
var NetObject = require('NetObject');
var NetClient = require('NetClient');

var boardImageUrl = '/images/xa_board_a_3.jpg';
var boardAlphaUrl = '/images/xa_board_alpha.png';
var cardImageUrl = '/images/buttonia.jpg';
var cardBoardZ = 10, cardDragZ = 300;
var cardW = 168, cardH = 230;


function snapDropPosition(position) {
	position.x = Math.round(position.x / cardW + 0.5)*cardW - cardW * 0.5;
	position.y = Math.round(position.y / cardH + 0.5)*cardH - cardH * 0.5;
	return position;
}

var NetPointer = function(scene, mouseHandler) {
	function pointerClientEvent(event) {
		//console.info('pointerClientEvent(%s);', JSON.stringify(event));
		var position = this.mesh.position;
		var color = this.mesh.material.color;
		switch(event.type) {
			case 'mousedown': color.set(0xff0000); break;
			case 'mouseup': color.set(0x00ff00); break;
			case 'mousemove':
				if(event.position) position.copy(event.position);
				break;
			default: console.error('Unkown event type:', event.type);
		}
	}
	function pointerProxyEvent(event) {
		//console.info('pointerProxyEvent(%s);', JSON.stringify(event));
		var position = this.mesh.position;
		var color = this.mesh.material.color;
		switch(event.type) {
			case 'mousedown': color.set(0xff0000); break;
			case 'mouseup': color.set(0xff00ff); break;
			case 'mousemove':
				if(event.position) position.copy(event.position);
				break;
			default: console.error('Unkown event type:', event.type);
		}
	}
	function handleCreateClient() {
		//console.info('initClientPointerInstance(%s);', this.toString());
		var self = this, client = this.owner;
		this.boundHandleMousedown = function(e) {
			var event = {type: 'mousedown'};
			if(e.intersection) event.position = e.intersection.point;
			client.socket.emit('instanceevent', {id: self.id,	event: event});
		};
		this.boundHandleMouseup = function(e) {
			var event = {type: 'mouseup'};
			if(e.intersection) event.position = e.intersection.point;
			client.socket.emit('instanceevent', {id: self.id,	event: event});
		};
		this.boundHandleMousemove = function(e) {
			var event = {type: 'mousemove'};
			if(e.intersection) event.position = e.intersection.point;
			client.socket.emit('instanceevent', {id: self.id,	event: event});
			if(event.position) self.writeframe.position.copy(event.position);
		};
		mouseHandler.addEventListener('mousedown', this.boundHandleMousedown);
		mouseHandler.addEventListener('mouseup', this.boundHandleMouseup);
		mouseHandler.addEventListener('mousemove', this.boundHandleMousemove);
		var mesh = new THREE.Mesh(
			new THREE.CubeGeometry(60, 60, 60),
			new THREE.MeshPhongMaterial({color: 0x00ff00, transparent: true, opacity: 0.6})
		);
		mesh.rotation.set(45 * Math.PI / 180, 45 * Math.PI / 180, 0);
		scene.add(mesh);
		var writeframe = new THREE.Mesh(
			new THREE.CubeGeometry(60, 60, 60),
			new THREE.MeshPhongMaterial({color: 0x00ff00, transparent: true, opacity: 0.6, wireframe: true})
		);
		writeframe.rotation.set(45 * Math.PI / 180, 45 * Math.PI / 180, 0);
		scene.add(writeframe);
		this.onevent = pointerClientEvent;
		this.mesh = mesh;
		this.writeframe = writeframe;
	}
	function handleCreateProxy() {
		//console.info('initClientProxyInstance(%s);', this.toString());
		var mesh = new THREE.Mesh(
			new THREE.CubeGeometry(60, 60, 60),
			new THREE.MeshPhongMaterial({color: 0xff00ff, transparent: true, opacity: 0.3})
		);
		scene.add(mesh);
		this.onevent = pointerProxyEvent;
		this.mesh = mesh;
	}
	function handleDestroy() {
		//console.info('NetPointer > handleDestroy();');
		scene.remove(this.mesh);
		scene.remove(this.wireframe);
		mouseHandler.removeEventListener('mousedown', this.boundHandleMousedown);
		mouseHandler.removeEventListener('mousemove', this.boundHandleMousemove);
	}

	return {
		oncreateclient: handleCreateClient,
		oncreateproxy: handleCreateProxy,
		ondestroy: handleDestroy
	};
};


function initClient(app) {
	var scene = app.scene;
	var mouseHandler = app.mouseHandler;
	var cardTex = app.loadTexture(cardImageUrl);
	var cardRefs = {};
	var dragAndDrop = new DragAndDrop({prototype: app, dropZ: cardBoardZ, dragZ: cardDragZ});
	dragAndDrop.attachToMouseHandler(app.mouseHandler);
	dragAndDrop.snapDropPosition = snapDropPosition;
	function getCardById(id) {
		return cardRefs[id];
	}
	function cardMoveHandler(e) {
		console.info('cardMoveHandler(e);');
		this.state.x = this.position.x;
		this.state.y = this.position.y;
		this.state.z = this.position.z;
		client.socket.emit('card', {card: this.state});
	}
	function createCard(cardData) {
		console.info('createCard(%s);', JSON.stringify(cardData));
		var card = new XenoCard(cardData.type, cardTex);
		cardRefs[cardData.id] = card;
		card.state = cardData;
		card.position.set(cardData.x, cardData.y, cardData.z);
		scene.add(card);
		dragAndDrop.attachCard(card);
		card.addEventListener('dragstart', cardMoveHandler);
		card.addEventListener('drag', cardMoveHandler);
		card.addEventListener('dragfinish', cardMoveHandler);
	}

	var client = new NetClient();
	client.connect(io.connect('//:81'));


	client.registerObject('NetPointer', NetPointer(scene, mouseHandler));

	client.socket.emit('createinstance', {name: 'NetPointer'});

	/*
		client.socket.on('connect', function(data) {
			console.info('CLIENT ID:', client.socket.id);
		});
		client.socket.on('state', function(data) {
			client.state = data;
			client.state.cards.forEach(createCard);
		});
		client.socket.on('card', function(data) {
			var card = getCardById(data.card.id);
			card.state.x = data.card.x;
			card.state.y = data.card.y;
			card.state.z = data.card.z;
			var statePos = new THREE.Vector3(card.state.x, card.state.y, card.state.z);
			var moveVector = new THREE.Vector3().subVectors(statePos, card.position);
			card.position.copy(statePos);
			card.animateMesh(moveVector);
		});
	*/

}

function Prototype_init() {
	var loadTexture = this.getLoadTexture();
	var boardTex = loadTexture(boardImageUrl);
	var boardAlpha = loadTexture(boardAlphaUrl);
	var mouseHandler = this.mouseHandler = new MouseHandler({
		domElement: this.renderer.domElement,
		camera: this.camera,
		scene: this.scene
	});
	var pointer = new MouseCursor({scene: this.scene}).attach(mouseHandler);
	var controlsSwitcher = new ControlsSwitcher(this.controls).attach(mouseHandler);

	this.setCamera(new THREE.Vector3(0, -400, 1000), new THREE.Vector3(0, -90, 0));
	initLights(this);
	this.scene.add(createBoard(boardTex, boardAlpha));

	initClient(this);
}

document.addEventListener('DOMContentLoaded', function init() {
	var prototype = new THREEPrototype();
	prototype.oninit = Prototype_init;
	prototype.start();
});

})();