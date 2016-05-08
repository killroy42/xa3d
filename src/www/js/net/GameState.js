(function() {
/*jslint node: true */
'use strict';


function GameState() {
	this.data = {};
}
GameState.prototype = Object.create(null);
GameState.prototype.constructor = GameState;
GameState.prototype.set = function(state) {
	console.info('GameState.set(state); %s -> %s', this.version, state.v);
	this.version.set(state.v.version);
	this.data = state.data;
};
GameState.prototype.versionSet = function(version) {
	this.version.set(version);
	return this.version;
};
GameState.prototype.versionIncMinor = function() {
	console.log(this.version);
	this.version.minor++;
	console.log(this.version);
	return this.version;
};
GameState.prototype.versionToJSON = function() {
	return {from: this.versionPrev, to: this.version};
};
GameState.prototype.toJSON = function() {
	return {
		v: this.version,
		data: this.data
	};
};


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = GameState;
}

})();