(function() {
	/*jslint node: true */
	'use strict';
	var NetObject = require('NetObject');


	function NetClient() {
		this.objects = [];
		this.instances = [];
	}
	NetClient.prototype = Object.create(null);
	NetClient.prototype.constructor = NetClient;
	NetClient.prototype.getInstances = function(prop, val) {
		return this.instances.filter(function(instance) {
			return instance[prop] === val;
		});
	};
	NetClient.prototype.createInstance = function(id, name, type) {
		//console.info('NetClient.createInstance(%s, %s, %s);', id, name, type);
		var instance = new NetObject({id: id, name: name, type: type, owner: this});
		this.instances.push(instance);
		var object = this.objects[instance.name];
		if(object.oncreateclient) instance.oncreateclient = object.oncreateclient;
		if(object.oncreateproxy) instance.oncreateproxy = object.oncreateproxy;
		if(object.ondestroy) instance.ondestroy = object.ondestroy;
		if(type === 'client') instance.trigger('createclient');
		if(type === 'proxy') instance.trigger('createproxy');
	};
	NetClient.prototype.destroyInstances = function(ids) {
		console.info('NetClient.destroyInstances(ids);');
		this.instances
			.filter(function(instance) { return ids.indexOf(instance.id) !== -1; })
			.forEach(function(instance) { instance.trigger('destroy'); });
		this.instances = this.instances.filter(function(instance) { return ids.indexOf(instance.id) === -1; });
	};
	NetClient.prototype.connect = function(socket) {
		//console.info('NetClient.connect(socket);');
		var self = this;
		this.socket = socket;
		this.instances = [];
		function handleCreateclient(data) { self.createClient(data.instance); }
		function handleCreateproxies(data) { self.createProxies(data.instances); }
		function handleDestroyinstances(data) { self.destroyInstances(data.instances); }
		function handleInstanceEvent(data) {
			var res = self.getInstances('id', data.id);
			if(res.length === 0) throw new Error('Invalid instance id: '+data.id);
			res[0].trigger('event', data.event);
		}
		socket.on('createclient', handleCreateclient);
		socket.on('createproxies', handleCreateproxies);
		socket.on('destroyinstances', handleDestroyinstances);
		socket.on('instanceevent', handleInstanceEvent);
	};
	NetClient.prototype.createClient = function(opts) {
		//console.info('NetClient.createClient(%s);', JSON.stringify(opts));
		this.createInstance(opts.id, opts.name, 'client');
	};
	NetClient.prototype.createProxies = function(opts) {
		//console.info('NetClient.createProxies(%s);', JSON.stringify(opts));
		var self = this;
		if(Array.isArray(opts)) {
			opts.forEach(function(opts) { self.createProxies(opts); });
		} else {
			this.createInstance(opts.id, opts.name, 'proxy');
		}
	};
	NetClient.prototype.registerObject = function(name, opts) {
		//console.info('NetClient.registerObject("%s");', name);
		this.objects[name] = opts;
	};


	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = NetClient;
	}
})();