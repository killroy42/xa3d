(function() {
const EventDispatcher = require('../xeno/EventDispatcher');

function NetId(client, id, isProxy) {
	//console.info('new NetId(client, %s, %s);', id, isProxy === true);
	EventDispatcher.apply(this);
	var isOwner = isProxy !== true;
	var state = NetId.READY;
	this.client = client;
	this.id = id;
	Object.defineProperties(this, {
		isProxy: { get: function() { return !isOwner; } },
		isOwner: { get: function() { return isOwner; } },
		isReady: { get: function() { return this.state === NetId.READY; } },
		state: {
			get: function() {
				return state;
			},
			set: function(val) {
				state = val;
				if(state === NetId.ISDESTROYING) this.dispatchEvent('requestdestroy');
				else if(state === NetId.DESTROYED) this.dispatchEvent('destroyed');
				return state;
			}
		},
	});
}
NetId.READY = 'READY';
NetId.ISDESTROYING = 'ISDESTROYING';
NetId.DESTROYED = 'DESTROYED';
NetId.MSG_CLIENT_INIT = 'netid/clientinit';
NetId.MSG_CREATE = 'netid/create';
NetId.MSG_CREATE_PEER = 'netid/createpeer';
NetId.MSG_DESTROY = 'netid/destroy';
NetId.MSG_MSG = 'netid/msg';
NetId.MSG_MSG_PEERS = 'netid/msgpeers';
NetId.MSG_BP_CREATE = 'netid/bpcreate';
NetId.prototype = Object.create(null);
NetId.prototype.constructor = NetId;
// Actions
	NetId.prototype.destroy = function() {
		//console.error('NetId.destroy(); state = %s', this.state);
		this.assertOwner();
		this.assertState(NetId.READY);
		this.state = NetId.ISDESTROYING;
	};
	NetId.prototype.send = function(msg) {
		//var debugLabel = this.client.isClient?'C -> S':'S -> C';
		//console.log('[%s] %s: %s', debugLabel, this.id, JSON.stringify(msg));
		this.client.send(NetId.MSG_MSG, {id: this.id, msg: msg});
	};
	NetId.prototype.sendToPeers = function(msg) {
		this.client.send(NetId.MSG_MSG_PEERS, {id: this.id, msg: msg});
	};
// Serialization
	NetId.prototype.serialize = function() {
		return {id: this.id};
	};
	NetId.prototype.toJSON = function() {
		return {
			id: this.id,
			state: this.state,
			proxy: this.isProxy
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