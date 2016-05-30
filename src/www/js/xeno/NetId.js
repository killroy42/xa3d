(function() {
'use strict';

var EventDispatcher = require('./EventDispatcher');


function NetId(client, id, isProxy) {
	EventDispatcher.apply(this);
	var isOwner = isProxy !== true;
	this.state = NetId.READY;
	this.client = client;
	this.id = id;
	Object.defineProperties(this, {
		isProxy: { get: function() { return !isOwner; } },
		isOwner: { get: function() { return isOwner; } },
		isReady: { get: function() { return this.state === NetId.READY; } },
	});
}
NetId.READY = 'READY';
NetId.ISDESTROYING = 'ISDESTROYING';
NetId.DESTROYED = 'DESTROYED';
NetId.prototype = Object.create(null);
NetId.prototype.constructor = NetId;
// Actions
	NetId.prototype.destroy = function() {
		//console.error('NetId.destroy(); state = %s', this.state);
		this.assertOwner();
		this.assertState(NetId.READY);
		this.state = NetId.ISDESTROYING;
		this.dispatchEvent('requestdestroy');
	};
	NetId.prototype.send = function(msg) {
		var debugLabel = this.client.isClient()?'C -> S':'S -> C';
		console.log('[%s] %s: %s', debugLabel, this.id, JSON.stringify(msg));
		this.client.send('id.msg', {id: this.id, msg: msg});
	};
// Serialization
	NetId.prototype.serialize = function() {
		return {id: this.id};
	};
	NetId.prototype.toJSON = function() {
		return {
			id: this.id,
			state: this.state,
			proxy: this.isProxy()
		};
	};
// Checks
	NetId.prototype.assertOwner = function() {
		if(!this.isOwner) throw new Error('This operation requires NetID ownership.');
	};

	NetId.prototype.assertState = function(state) {
		if(this.state !== state) throw new Error('Invalid NetId state: "'+this.state+'". Expected: "'+state+'"');
	};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = NetId;
}

})();