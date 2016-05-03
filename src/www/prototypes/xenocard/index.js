(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var THREEPrototype = require('THREEPrototype');
var initLights = require('initLights');
var XenoCard = THREE.XenoCard = require('XenoCard');

var cardImageUrl = '/images/buttonia.jpg';
var cardW = 168, cardH = 230;

function snapCardPosition(position) {
	position.x = Math.round(position.x / cardW + 0.5)*cardW - cardW * 0.5;
	position.y = Math.round(position.y / cardH + 0.5)*cardH - cardH * 0.5;
	return position;
}

// Init
	function createCards(scene, cardTex) {
		for(var i = 0; i < 20; i++) {
			var type = Math.floor(Math.random()*5);
			var card = new THREE.XenoCard(type, cardTex);
			card.position.set(
				(Math.random()*2-1)*3*cardW,
				(Math.random()*2-1)*2*cardH,
				10
			);
			snapCardPosition(card.position);
			scene.add(card);
		}
	}

// Init Prototype
	function Prototype_init() {
		this.setCamera(new THREE.Vector3(0, -400, 1000), new THREE.Vector3(0, -90, 0));
		initLights(this);
		var cardTex = this.loadTexture(cardImageUrl);
		createCards(this.scene, cardTex);
		var card = new THREE.XenoCard(0, cardTex);
		card.position.set(0, 0, 100);
		this.scene.add(card);
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();