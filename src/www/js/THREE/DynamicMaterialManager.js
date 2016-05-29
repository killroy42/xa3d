(function() {
'use strict';

var DynamicShaderMaterial = require('DynamicShaderMaterial');
var MaterialRenderer = require('MaterialRenderer');


function DynamicMaterialManager(renderer) {
	var dynMats = [];
	var matRenderer = new MaterialRenderer(renderer);
	this.add = function(name, material, target) {
		//console.info('DynamicMaterialManager.add("%s", material, target);', name);
		dynMats.push({name: name, material: material, target: target});
		return target;
	};
	this.update = function(time) {
		for(var i = 0, l = dynMats.length; i < l; i++) {
			dynMats[i].material.animate(time);
		}
	};
	this.render = function(time) {
		for(var i = 0, l = dynMats.length; i < l; i++) {
			if(dynMats[i].target) matRenderer.render(dynMats[i].material, dynMats[i].target);
		}
	};
	this.updateAndRender = function(time) {
		for(var i = 0, l = dynMats.length; i < l; i++) {
			dynMats[i].material.animate(time);
			if(dynMats[i].target) matRenderer.render(dynMats[i].material, dynMats[i].target);
		}
	};
}
DynamicMaterialManager.prototype = Object.create(null);
DynamicMaterialManager.prototype.constructor = DynamicMaterialManager;



if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = DynamicMaterialManager;
}

})();