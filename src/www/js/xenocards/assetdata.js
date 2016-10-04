(function() {
'use strict';

const colors = {
	white: 0xffffff,
	black: 0x000000,
	grey50: 0xfafafa, grey100: 0xf5f5f5, grey200: 0xeeeeee, grey300: 0xe0e0e0, grey400: 0xbdbdbd, grey500: 0x9e9e9e, grey600: 0x757575, grey700: 0x616161, grey800: 0x424242, grey900: 0x212121,
	Yellow200: 0xFFF59D, Yellow300: 0xFFF176, Yellow400: 0xFFEE58,
	BlueGrey50: 0xECEFF1, BlueGrey100: 0xCFD8DC, BlueGrey200: 0xB0BEC5, BlueGrey300: 0x90A4AE, BlueGrey400: 0x78909C, BlueGrey500: 0x607D8B, BlueGrey600: 0x546E7A, BlueGrey700: 0x455A64, BlueGrey800: 0x37474F, BlueGrey900: 0x263238,
	Pink50: 0xF3E5F5, Pink100: 0xF8BBD0, Pink200: 0xF48FB1, Pink300: 0xF06292, Pink400: 0xEC407A, Pink500: 0xE91E63, Pink600: 0xD81B60, Pink700: 0xC2185B, Pink800: 0xAD1457, Pink900: 0x880E4F,
	Teal50: 0xE0F2F1, Teal100: 0xB2DFDB, Teal200: 0x80CBC4, Teal300: 0x4DB6AC, Teal400: 0x26A69A, Teal500: 0x009688, Teal600: 0x00897B, Teal700: 0x00796B, Teal800: 0x00695C, Teal900: 0x004D40,
	'Red': {'50': '#FFEBEE', '100': '#FFCDD2', '200': '#EF9A9A', '300': '#E57373', '400': '#EF5350', '500': '#F44336', '600': '#E53935', '700': '#D32F2F', '800': '#C62828', '900': '#B71C1C', 'A100': '#FF8A80', 'A200': '#FF5252', 'A400': '#FF1744', 'A700': '#D50000'},
	'Pink': {'50': '#FCE4EC', '100': '#F8BBD0', '200': '#F48FB1', '300': '#F06292', '400': '#EC407A', '500': '#E91E63', '600': '#D81B60', '700': '#C2185B', '800': '#AD1457', '900': '#880E4F', 'A100': '#FF80AB', 'A200': '#FF4081', 'A400': '#F50057', 'A700': '#C51162'},
	'Purple': {'50': '#F3E5F5', '100': '#E1BEE7', '200': '#CE93D8', '300': '#BA68C8', '400': '#AB47BC', '500': '#9C27B0', '600': '#8E24AA', '700': '#7B1FA2', '800': '#6A1B9A', '900': '#4A148C', 'A100': '#EA80FC', 'A200': '#E040FB', 'A400': '#D500F9', 'A700': '#AA00FF'},
	'Deep Purple': {'50': '#EDE7F6', '100': '#D1C4E9', '200': '#B39DDB', '300': '#9575CD', '400': '#7E57C2', '500': '#673AB7', '600': '#5E35B1', '700': '#512DA8', '800': '#4527A0', '900': '#311B92', 'A100': '#B388FF', 'A200': '#7C4DFF', 'A400': '#651FFF', 'A700': '#6200EA'},
	'Indigo': {'50': '#E8EAF6', '100': '#C5CAE9', '200': '#9FA8DA', '300': '#7986CB', '400': '#5C6BC0', '500': '#3F51B5', '600': '#3949AB', '700': '#303F9F', '800': '#283593', '900': '#1A237E', 'A100': '#8C9EFF', 'A200': '#536DFE', 'A400': '#3D5AFE', 'A700': '#304FFE'},
	'Blue': {'50': '#E3F2FD', '100': '#BBDEFB', '200': '#90CAF9', '300': '#64B5F6', '400': '#42A5F5', '500': '#2196F3', '600': '#1E88E5', '700': '#1976D2', '800': '#1565C0', '900': '#0D47A1', 'A100': '#82B1FF', 'A200': '#448AFF', 'A400': '#2979FF', 'A700': '#2962FF'},
	'Light Blue': {'50': '#E1F5FE', '100': '#B3E5FC', '200': '#81D4FA', '300': '#4FC3F7', '400': '#29B6F6', '500': '#03A9F4', '600': '#039BE5', '700': '#0288D1', '800': '#0277BD', '900': '#01579B', 'A100': '#80D8FF', 'A200': '#40C4FF', 'A400': '#00B0FF', 'A700': '#0091EA'},
	'Cyan': {'50': '#E0F7FA', '100': '#B2EBF2', '200': '#80DEEA', '300': '#4DD0E1', '400': '#26C6DA', '500': '#00BCD4', '600': '#00ACC1', '700': '#0097A7', '800': '#00838F', '900': '#006064', 'A100': '#84FFFF', 'A200': '#18FFFF', 'A400': '#00E5FF', 'A700': '#00B8D4'},
	'Teal': {'50': '#E0F2F1', '100': '#B2DFDB', '200': '#80CBC4', '300': '#4DB6AC', '400': '#26A69A', '500': '#009688', '600': '#00897B', '700': '#00796B', '800': '#00695C', '900': '#004D40', 'A100': '#A7FFEB', 'A200': '#64FFDA', 'A400': '#1DE9B6', 'A700': '#00BFA5'},
	'Green': {'50': '#E8F5E9', '100': '#C8E6C9', '200': '#A5D6A7', '300': '#81C784', '400': '#66BB6A', '500': '#4CAF50', '600': '#43A047', '700': '#388E3C', '800': '#2E7D32', '900': '#1B5E20', 'A100': '#B9F6CA', 'A200': '#69F0AE', 'A400': '#00E676', 'A700': '#00C853'},
	'Light Green': {'50': '#F1F8E9', '100': '#DCEDC8', '200': '#C5E1A5', '300': '#AED581', '400': '#9CCC65', '500': '#8BC34A', '600': '#7CB342', '700': '#689F38', '800': '#558B2F', '900': '#33691E', 'A100': '#CCFF90', 'A200': '#B2FF59', 'A400': '#76FF03', 'A700': '#64DD17'},
	'Lime': {'50': '#F9FBE7', '100': '#F0F4C3', '200': '#E6EE9C', '300': '#DCE775', '400': '#D4E157', '500': '#CDDC39', '600': '#C0CA33', '700': '#AFB42B', '800': '#9E9D24', '900': '#827717', 'A100': '#F4FF81', 'A200': '#EEFF41', 'A400': '#C6FF00', 'A700': '#AEEA00'},
	'Yellow': {'50': '#FFFDE7', '100': '#FFF9C4', '200': '#FFF59D', '300': '#FFF176', '400': '#FFEE58', '500': '#FFEB3B', '600': '#FDD835', '700': '#FBC02D', '800': '#F9A825', '900': '#F57F17', 'A100': '#FFFF8D', 'A200': '#FFFF00', 'A400': '#FFEA00', 'A700': '#FFD600'},
	'Amber': {'50': '#FFF8E1', '100': '#FFECB3', '200': '#FFE082', '300': '#FFD54F', '400': '#FFCA28', '500': '#FFC107', '600': '#FFB300', '700': '#FFA000', '800': '#FF8F00', '900': '#FF6F00', 'A100': '#FFE57F', 'A200': '#FFD740', 'A400': '#FFC400', 'A700': '#FFAB00'},
	'Orange': {'50': '#FFF3E0', '100': '#FFE0B2', '200': '#FFCC80', '300': '#FFB74D', '400': '#FFA726', '500': '#FF9800', '600': '#FB8C00', '700': '#F57C00', '800': '#EF6C00', '900': '#E65100', 'A100': '#FFD180', 'A200': '#FFAB40', 'A400': '#FF9100', 'A700': '#FF6D00'},
	'Deep Orange': {'50': '#FBE9E7', '100': '#FFCCBC', '200': '#FFAB91', '300': '#FF8A65', '400': '#FF7043', '500': '#FF5722', '600': '#F4511E', '700': '#E64A19', '800': '#D84315', '900': '#BF360C', 'A100': '#FF9E80', 'A200': '#FF6E40', 'A400': '#FF3D00', 'A700': '#DD2C00'},
	'Brown': {'50': '#EFEBE9', '100': '#D7CCC8', '200': '#BCAAA4', '300': '#A1887F', '400': '#8D6E63', '500': '#795548', '600': '#6D4C41', '700': '#5D4037', '800': '#4E342E', '900': '#3E2723'},
	'Grey': {'50': '#FAFAFA', '100': '#F5F5F5', '200': '#EEEEEE', '300': '#E0E0E0', '400': '#BDBDBD', '500': '#9E9E9E', '600': '#757575', '700': '#616161', '800': '#424242', '900': '#212121'},
	'Blue Grey': {'50': '#ECEFF1', '100': '#CFD8DC', '200': '#B0BEC5', '300': '#90A4AE', '400': '#78909C', '500': '#607D8B', '600': '#546E7A', '700': '#455A64', '800': '#37474F', '900': '#263238'},
	'Black': {
		'500': '#000000',
		'Text': 'rgba(0,0,0,0.87)',
		'Secondary Text': 'rgba(0,0,0,0.54)',
		'Icons': 'rgba(0,0,0,0.54)',
		'Disabled': 'rgba(0,0,0,0.26)',
		'Hint Text': 'rgba(0,0,0,0.26)',
		'Dividers': 'rgba(0,0,0,0.12)'
	},
	'White': { 
		'500': '#ffffff',
		'Text': '#ffffff',
		'Secondary Text': 'rgba(255,255,255,0.7)',
		'Icons': '#ffffff',
		'Disabled': 'rgba(255,255,255,0.3)',
		'Hint Text': 'rgba(255,255,255,0.3)',
		'Dividers': 'rgba(255,255,255,0.12)'
	},
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
	module.exports = {
		colors,
		dimensions,
		cardInfo,
		portraitPath,
		portraits,
		boardTextureUrl,
		boardAlphaUrl,
		getRandomPortraitUrl,
		snapCardPosition,
		cardOutline,
		CardIcon,
	};
	module.exports.assetdata = module.exports;
}
})();