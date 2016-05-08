(function() {
/*jslint node: true */
'use strict';


function VersionNumber(val) {
	console.info('new VersionNumber(%s);', val);
	var major = 0, minor = 0, prev = '0.0';
	Object.defineProperties(this, {
		major: {
			enumerable: true,
			get: function() { return major; },
			set: function(val) {
				val = VersionNumber.validateComponent(val);
				prev = this.version;
				major = val;
				return major;
			}
		},
		minor: {
			enumerable: true,
			get: function() { return minor; },
			set: function(val) {
				val = VersionNumber.validateComponent(val);
				prev = this.version;
				minor = val;
				return minor;
			}
		},
		version: {
			enumerable: true,
			get: function() { return major+'.'+minor; },
			set: function(val) {
				var version = String(VersionNumber.validateVersion(val)).split('.');
				prev = this.version;
				major = version[0];
				minor = version[1] || 0;
				return this.verion;
			}
		},
		prev: { 
			enumerable: true,
			get: function () { return prev; }
		},
		incMinor: {
			enumerable: true,
			value: function() {
				prev = this.version;
				minor++;
			}
		},
		incMajor: {
			enumerable: true,
			value: function() {
				prev = this.version;
				major++;
				minor = 0;
			}
		}
	});
	this.version = val;
}
VersionNumber.prototype = Object.create(null);
VersionNumber.prototype.constructor = VersionNumber;
VersionNumber.RE_VERSION = new RegExp('^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$');
VersionNumber.RE_VERSIONCOMPONENT = new RegExp('^(0|[1-9][0-9]*)$');
VersionNumber.validateVersion = function(val) {
	if(!VersionNumber.RE_VERSION.test(val)) throw new TypeError('Invalid version value.');
	return Number(val);
};
VersionNumber.validateComponent = function(val) {
	if(!VersionNumber.RE_VERSIONCOMPONENT.test(val)) throw new TypeError('Invalid version value.');
	return Number(val);
};
VersionNumber.prototype.set = function(val) {
	this.version = val;
};
VersionNumber.prototype.valueOf = function() {
	return this.version;
};
VersionNumber.prototype.toString = function() {
	return this.version;
};
VersionNumber.prototype.toJSON = function() {
	return {version: this.version, prev: this.prev};
};
VersionNumber

if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = VersionNumber;
}

})();