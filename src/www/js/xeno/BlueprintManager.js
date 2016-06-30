(function() {
'use strict';

var NetId = require('./NetId');
var BlueprintCore = require('./BlueprintCore');


function BlueprintManager() {
	this.blueprints = {};
}
BlueprintManager.prototype = Object.create(null);
BlueprintManager.prototype.constructor = BlueprintManager;
BlueprintManager.prototype.register = function(name, blueprint, context) {
	if(typeof name === 'object') {
		var self = this;
		Object.keys(name).forEach(function(key) {
			self.register(key, name[key], blueprint);
		});
	} else {
		//console.info('BlueprintManager.register("%s", %s);', name, blueprint.name);
		this.blueprints[name] = BlueprintCore.createBlueprint(name, blueprint, context);
	}
};
BlueprintManager.prototype.instantiate = function(netId, name, state) {
	if(state === undefined) state = {};
	//console.info('BlueprintManager.instantiate(netId, "%s", %s);', name, JSON.stringify(state));
	if(this.blueprints[name] === undefined) {
		console.warn('Creating bare blueprint for "%s"', name);
		this.blueprints[name] = BlueprintCore.createBlueprint(name);
	}
	var Blueprint = this.blueprints[name];
	return new Blueprint(netId, state);
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = BlueprintManager;
}

})();