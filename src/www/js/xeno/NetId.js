(function() {
'use strict';

var EventDispatcher = require('./EventDispatcher');


function NetId(opts) {
	EventDispatcher.apply(this);
	this.state = NetId.NEW;
	opts = opts || {};
	if(opts.id) this.id = opts.id;
	if(opts.owner) this.owner = opts.owner;
	if(opts.state) this.state = opts.state;
}
NetId.NEW = 'new';
NetId.READY = 'ready';
NetId.DESTROYED = 'destroyed';
NetId.prototype = Object.create(null);
NetId.prototype.constructor = NetId;
// Setup
	NetId.prototype.create = function(id) {
		this.state = NetId.NEW;
		this.id = id;
		this.owner.send('id.new', this.serialize());
		return this;
	};
	NetId.prototype.ready = function(id, ref) {
		console.info('NetId.ready(%s, %s);', id, ref);
		this.state = NetId.READY;
		this.id = id;
		this.owner.send('id.ready', {ref: ref, netid: this.serialize()});
		this.owner.sendPeers('id.peer', this.serialize());
		this.dispatchEvent('ready');
		return this;
	};
	NetId.prototype.confirm = function(id) {
		//console.info('NetId.confirm(%s);', id);
		this.state = NetId.READY;
		this.id = id;
		this.dispatchEvent('ready');
		return this;
	};
	NetId.prototype.destroy = function() {
		//console.info('NetId.destroy();');
		this.state = NetId.DESTROYED;
		this.dispatchEvent('destroyed');
		if(!this.isProxy()) {
			this.owner.send('id.destroy', this.serialize());
			if(this.owner.isServer()) {
				this.owner.sendPeers('id.destroy', this.serialize());
			}
		}
		return this;
	};
// Actions
	NetId.prototype.send = function(msg) {
		var debugLabel = this.owner.isClient()?'C -> S':'S -> C';
		console.log('[%s] %s: %s', debugLabel, this.id, JSON.stringify(msg));
		this.owner.send('id.msg', {id: this.id, msg: msg});
	};
// Info
	NetId.prototype.isProxy = function() {
		return this.owner === undefined;
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


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = NetId;
}

})();