(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var THREEPrototype = require('THREEPrototype');
var initLights = require('initLights');
var assetdata = require('assetdata');
var XenoCard3D = require('XenoCard3D');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var snapCardPosition = assetdata.snapCardPosition;
var cardInfo = assetdata.cardInfo;
var cardW = cardInfo.width, cardH = cardInfo.height;


// Init Prototype
	function Prototype_init() {
		var scene = this.scene;
		this.setCamera(new THREE.Vector3(0, -200, 400), new THREE.Vector3(0, 0, 0));
		initLights(this);
		var xenoCard3D = new XenoCard3D();
		var card, x, y, portraitTex;
		for(var i = 0; i < 20; i++) {
			portraitTex = this.loadTexture(getRandomPortraitUrl());
			card = xenoCard3D.createCard(portraitTex);
			x = (Math.random()*2-1)*3*cardW;
			y = (Math.random()*2-1)*2*cardH;
			card.position.set(x, y, 10);
			snapCardPosition(card.position);
			scene.add(card);
		}
	}
	function init() {
		var prototype = new THREEPrototype();
		prototype.oninit = Prototype_init;
		prototype.start();
	}

document.addEventListener('DOMContentLoaded', init);
	
})();