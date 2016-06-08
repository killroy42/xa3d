(function() {
'use strict';

var Network = require('../Network');

function normalizeV(v) {
	var vLen = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
	v.x /= vLen;
	v.y /= vLen;
	v.z /= vLen;
	return v;
}

var blueprint = {
	name: 'BoxBlueprint',
	refreshInterval: 100,
	OnCreateServer: function() {
		//console.info('BoxBlueprint.OnCreateServer();');
		var self = this;
		this.moverInterval = setInterval(function() { self.move(); }, this.refreshInterval);
	},
	OnDestroy: function() {
		//console.info('BoxBlueprint[%s].OnDestroy();', this.peerType);
		clearInterval(this.moverInterval);
	},
	move: function() {
		var v = this.state.velocity;
		var p = this.state.position;
		normalizeV(v);
		v.x += (Math.random() - 0.5) * 2;
		v.y += (Math.random() - 0.5) * 2;
		normalizeV(v);
		var speed = Math.random();
		p.x += v.x * speed;
		p.y += v.y * speed;
		p.z += v.z * speed;
		this.updateState();
	}
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = blueprint;
}
})();