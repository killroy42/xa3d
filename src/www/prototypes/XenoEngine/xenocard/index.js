(function() {

var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var THREEPrototype = require('THREEPrototype');
var GeometryHelpers = require('GeometryHelpers');
var initLights = require('initLights');
var assetdata = require('assetdata');
var XenoCard3D = require('XenoCard3D');

var getRandomPortraitUrl = assetdata.getRandomPortraitUrl;
var snapCardPosition = assetdata.snapCardPosition;
var cardInfo = assetdata.cardInfo;
var cardW = cardInfo.width, cardH = cardInfo.height;


function Prototype_init() {
	var scene = this.scene;
	var loadTexture = this.getLoadTexture();
	this.setCamera(new THREE.Vector3(0, 0, 500), new THREE.Vector3(0, 0, 0));
	initLights(this);
	var xenoCard3D = new XenoCard3D();

	var card, x, y, portraitTex;
	for(var i = 0; i < 20; i++) {
		portraitTex = loadTexture(getRandomPortraitUrl());
		card = xenoCard3D.createCard(portraitTex);
		x = (Math.random()*2-1)*3*cardW;
		y = (Math.random()*2-1)*2*cardH;
		card.position.set(x, y, 10);
		snapCardPosition(card.position);
		scene.add(card);
	}
	card = xenoCard3D.createCard(loadTexture(getRandomPortraitUrl()));
	card.position.set(0, 0, 100);
	scene.add(card);


}
function init() {
	var prototype = new THREEPrototype();
	prototype.oninit = Prototype_init;
	prototype.start();
}

document.addEventListener('DOMContentLoaded', init);
	
})();