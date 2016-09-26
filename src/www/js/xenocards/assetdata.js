(function() {
'use strict';

const colors = {
	white: 0xffffff,
	black: 0x000000,
	grey50: 0xfafafa,
	grey100: 0xf5f5f5,
	grey200: 0xeeeeee,
	grey300: 0xe0e0e0,
	grey400: 0xbdbdbd,
	grey500: 0x9e9e9e,
	grey600: 0x757575,
	grey700: 0x616161,
	grey800: 0x424242,
	grey900: 0x212121,
	yellow200: 0xFFF59D,
	yellow300: 0xFFF176,
	yellow400: 0xFFEE58,
	BlueGrey50: 0xECEFF1, BlueGrey100: 0xCFD8DC, BlueGrey200: 0xB0BEC5, BlueGrey300: 0x90A4AE, BlueGrey400: 0x78909C, BlueGrey500: 0x607D8B, BlueGrey600: 0x546E7A, BlueGrey700: 0x455A64, BlueGrey800: 0x37474F, BlueGrey900: 0x263238,
	Pink50: 0xF3E5F5, Pink100: 0xF8BBD0, Pink200: 0xF48FB1, Pink300: 0xF06292, Pink400: 0xEC407A, Pink500: 0xE91E63, Pink600: 0xD81B60, Pink700: 0xC2185B, Pink800: 0xAD1457, Pink900: 0x880E4F,
	Teal50: 0xE0F2F1, Teal100: 0xB2DFDB, Teal200: 0x80CBC4, Teal300: 0x4DB6AC, Teal400: 0x26A69A, Teal500: 0x009688, Teal600: 0x00897B, Teal700: 0x00796B, Teal800: 0x00695C, Teal900: 0x004D40,
};

const dimensions = {
	pixelScale: {
		screen: {width: 1920, height: 1080},
		board: {width: 1440, height: 1080},
		card: {width: 160, height: 220},
	},
	unitScale: {
		screen: {width: 19.2, height: 10.8},
		board: {width: 14.4, height: 10.8},
		card: {width: 1.6, height: 2.2},
	}
};
var cardInfo = {
	width: 168,
	height: 230,
	boardZ: 10,
	dragZ: 300,
	dragProxyZ: 100,
};
var boardTextureUrl = '/images/xa_board_a_3.jpg';
var boardAlphaUrl = '/images/xa_board_alpha.png';
var portraitPath = '/images/portraits/';
var portraits = [
	'apc.jpg',  
	'bustedtank.jpg', 
	'combatsalvager.jpg', 
	'crewman.jpg',  
	'dropship.jpg',  
	'gpounder.jpg',  
	'grunt.jpg',  
	'hangardeck.jpg', 
	'laserturret.jpg', 
	'launchbay.jpg',  
	'mbulwark.jpg',  
	'medevac.jpg',  
	'orbitaljumper.jpg', 
	'plaststeelplating.jpg', 
	'railer.jpg',  
	'robomine.jpg',  
	'saboteur.jpg',  
	'shieldgenerator.jpg', 
	'snapper.jpg',  
	'spacejunk.jpg',  
	'tungstenplating.jpg', 
	'voidspear.jpg',  
	'voidstriker.jpg', 
	'voidwarrior.jpg', 
	'wbulwark.jpg',
	'captainrex.jpg',
];
//var cardOutline = [[-0.7999,109.3916],[-9.5993,109.3916],[-16.7987,105.9856],[-42.3968,106.1515],[-43.9967,105.3286],[-49.5963,100.6316],[-50.8781,100.2602],[-51.9961,100.2327],[-55.9958,105.0715],[-62.3953,105.3284],[-71.9696,94.8435],[-72.7452,59.9483],[-67.9907,54.7277],[-68.9010,31.1849],[-71.7885,30.2855],[-72.2992,28.5317],[-72.5031,-15.5472],[-70.6642,-17.3113],[-70.8944,-23.6249],[-72.7945,-25.5479],[-73.3863,-27.7911],[-73.4209,-31.6125],[-71.2238,-32.5923],[-71.5389,-41.0912],[-79.9940,-57.5025],[-67.4541,-97.5964],[-66.3950,-98.8877],[-53.5960,-108.5290],[-52.2686,-108.9191],[-46.7721,-107.2095],[46.7721,-107.2095],[52.2686,-108.9191],[53.5960,-108.5290],[67.1950,-98.2851],[79.9940,-57.5025],[71.5683,-41.8854],[71.2473,-33.2258],[73.4209,-31.6125],[73.3705,-26.0433],[70.9030,-23.8603],[70.6712,-17.5022],[72.5031,-15.5472],[72.2992,30.0992],[68.9180,30.7147],[67.9907,54.7277],[72.7452,59.9483],[72.0808,94.0217],[71.1947,95.6970],[62.3953,105.3284],[56.7957,105.1036],[55.1959,104.1481],[52.7960,100.7747],[51.1962,100.2524],[49.5963,100.6316],[43.1968,105.9996],[15.9988,105.9805],[15.1989,107.0825],[10.5256,109.1372]];
var cardOutline = [[9.9426,109.3496],[15.6819,106.792],[15.6809,105.8371],[42.9167,105.9949],[43.8111,105.29],[49.9876,100.109],[52.2543,100.0745],[55.8486,105.0655],[62.4481,105.3305],[72.0669,94.7363],[73.2526,58.3973],[67.8014,54.2049],[68.7482,30.3611],[72.2992,30.2863],[72.5074,-16.1698],[70.2922,-11.4668],[70.8054,-25.5447],[73.366,-25.5489],[73.4224,-31.775],[71.045,-31.7777],[71.469,-43.2143],[72.2155,-43.2146],[80.094,-57.6861],[73.9157,-77.1941],[75.4082,-77.318],[74.8868,-85.6749],[73.5801,-91.72],[70.9494,-97.5099],[66.5525,-102.3541],[60.0213,-105.4998],[58.5383,-104.8061],[52.8419,-109.0971],[46.6703,-107.1778],[-46.6518,-107.172],[-52.7847,-109.0796],[-57.2687,-105.7625],[-59.998,-106.3053],[-66.238,-105.0649],[-71.5283,-101.531],[-75.0635,-96.2415],[-76.3054,-90.0018],[-75.0695,-83.7848],[-72.8774,-80.4867],[-80.0929,-57.6896],[-72.2176,-43.2184],[-71.5229,-43.2143],[-71.045,-31.7777],[-73.4136,-31.7896],[-73.3661,-25.5591],[-71.0317,-25.5451],[-70.2922,-11.4668],[-72.4984,-16.1697],[-72.2992,30.2863],[-68.8393,30.2809],[-67.7817,54.6077],[-72.7504,59.7196],[-72.4185,76.7037],[-72.9435,77.0554],[-76.9106,82.9921],[-78.3047,89.9949],[-76.9137,96.9984],[-72.9446,102.9434],[-67.008,106.9105],[-60,108.3057],[-52.9947,106.9123],[-47.3467,103.1384],[-43.8216,105.2812],[-42.9167,105.9949],[-15.7343,105.837],[-15.6819,106.7762],[-9.9426,109.3496]];

function getRandomPortraitUrl() {
	return portraitPath+portraits[Math.floor(Math.random() * portraits.length)];
}

function snapCardPosition(position) {
	var w = cardInfo.width;
	var h = cardInfo.height;
	position.x = (Math.round(position.x / w + 0.5) - 0.5)*w;
	position.y = (Math.round(position.y / h + 0.5) - 0.5)*h;
	return position;
}

function CardIcon() {}
CardIcon.getProfileShape = function() {
	const {Shape} = require('THREE');
	var shape = new Shape();
	//shape.moveTo(0, 20);
	//shape.lineTo(10, 10);
	//shape.lineTo(10, 10);
	//shape.lineTo(5, 0);
	
	shape.moveTo(0, 8);
	shape.lineTo(1, 9);
	shape.lineTo(3, 8);
	// Angelled edge
		shape.lineTo(2, 0);
	// Bevelled edge
		//shape.lineTo(4, 7);
		//shape.lineTo(4, 1);
		//shape.lineTo(3, 0);
	// Pointed edge
		//shape.bezierCurveTo(  3,  6,  3,  6,  4,  4);
		//shape.bezierCurveTo(  3,  2,  3,  2,  3,  0);
	// Curved edge
		//shape.bezierCurveTo(  4,  6,  4,  5,  4,  4);
		//shape.bezierCurveTo(  4,  3,  4,  2,  3,  0);
	return shape;
};
CardIcon.getDiscShape = function(radius) {
	const {Shape} = require('THREE');
	var shape = new Shape();
	// Works in r78
	//shape.absellipse(0, 0, radius, radius, 0.5 * Math.PI, 0.5 * Math.PI, true);
	// For r79dev
	shape.absellipse(0, 0, radius, radius, 0.5 * Math.PI, 2.5 * Math.PI + Number.EPSILON*2.1, true);
	return shape;
};
CardIcon.getShieldShape = function() {
	const {Shape} = require('THREE');
	var shape = new Shape();
	shape.moveTo( 0,  20);
	shape.bezierCurveTo(  5,  15,  15,  16,  20,  16);
	shape.bezierCurveTo( 20,   0,  15, -16,   0, -20);
	shape.bezierCurveTo(-15, -16, -20,   0, -20,  16);
	shape.bezierCurveTo(-15,  16,  -5,  15,   0,  20);
	return shape;
};


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {};
	module.exports.assetdata = module.exports;
	module.exports.colors = colors;
	module.exports.dimensions = dimensions;
	module.exports.cardInfo = cardInfo;
	module.exports.portraitPath = portraitPath;
	module.exports.portraits = portraits;
	module.exports.boardTextureUrl = boardTextureUrl;
	module.exports.boardAlphaUrl = boardAlphaUrl;
	module.exports.getRandomPortraitUrl = getRandomPortraitUrl;
	module.exports.snapCardPosition = snapCardPosition;
	module.exports.cardOutline = cardOutline;
	module.exports.CardIcon = CardIcon;
}
})();