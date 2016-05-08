(function() {
/*jslint node: true */
'use strict';


function NetObject(opts) {
	opts = opts || {};
	this.id = opts.id || NetObject.getNextId();
	this.name = opts.name || 'NetObject';
	this.type = opts.type;
	this.owner = opts.owner;
}
NetObject.prototype = Object.create(null);
NetObject.prototype.constructor = NetObject;
NetObject.nextId = 0;
NetObject.getNextId = function() {
	return NetObject.nextId++;
};
NetObject.prototype.trigger = function(name, event) {
	name = 'on'+name;
	if(typeof this[name] === 'function') this[name](event);
};
NetObject.prototype.toJSON = function() {
	return {id: this.id, name: this.name};
};
NetObject.prototype.toString = function() {
	return 'NetObject['+
		'id: '+this.id+
		', name: "'+this.name+'"'+
		', type: '+this.type+
		((this.owner !== undefined)?', owner: '+this.owner.id:'')+
	']';
};


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = NetObject;
}

})();