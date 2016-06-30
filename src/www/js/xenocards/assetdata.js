(function() {
'use strict';

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
var cardOutline = [[-0.7999,109.3916],[-9.5993,109.3916],[-16.7987,105.9856],[-42.3968,106.1515],[-43.9967,105.3286],[-49.5963,100.6316],[-50.8781,100.2602],[-51.9961,100.2327],[-55.9958,105.0715],[-62.3953,105.3284],[-71.9696,94.8435],[-72.7452,59.9483],[-67.9907,54.7277],[-68.9010,31.1849],[-71.7885,30.2855],[-72.2992,28.5317],[-72.5031,-15.5472],[-70.6642,-17.3113],[-70.8944,-23.6249],[-72.7945,-25.5479],[-73.3863,-27.7911],[-73.4209,-31.6125],[-71.2238,-32.5923],[-71.5389,-41.0912],[-79.9940,-57.5025],[-67.4541,-97.5964],[-66.3950,-98.8877],[-53.5960,-108.5290],[-52.2686,-108.9191],[-46.7721,-107.2095],[46.7721,-107.2095],[52.2686,-108.9191],[53.5960,-108.5290],[67.1950,-98.2851],[79.9940,-57.5025],[71.5683,-41.8854],[71.2473,-33.2258],[73.4209,-31.6125],[73.3705,-26.0433],[70.9030,-23.8603],[70.6712,-17.5022],[72.5031,-15.5472],[72.2992,30.0992],[68.9180,30.7147],[67.9907,54.7277],[72.7452,59.9483],[72.0808,94.0217],[71.1947,95.6970],[62.3953,105.3284],[56.7957,105.1036],[55.1959,104.1481],[52.7960,100.7747],[51.1962,100.2524],[49.5963,100.6316],[43.1968,105.9996],[15.9988,105.9805],[15.1989,107.0825],[10.5256,109.1372]];


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


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = {};
	module.exports.assetdata = module.exports;
	module.exports.cardInfo = cardInfo;
	module.exports.portraitPath = portraitPath;
	module.exports.portraits = portraits;
	module.exports.boardTextureUrl = boardTextureUrl;
	module.exports.boardAlphaUrl = boardAlphaUrl;
	module.exports.getRandomPortraitUrl = getRandomPortraitUrl;
	module.exports.snapCardPosition = snapCardPosition;
	module.exports.cardOutline = cardOutline;
}
})();