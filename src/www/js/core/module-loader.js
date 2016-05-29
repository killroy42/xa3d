/*
	Title: CodePen Module Loader v 1.0.1
	Author: Sven Neumann <killroy@gmail.com>
	GitHub: https://github.com/killroy42/CodePen-module-loader
	CodePen: http://codepen.io/killroy/pen/xVqNeL
*/

(function(scope, module, require) {
	'use strict';
	/*jslint evil: true */
	var RE_MODULEFILE = /^.*\/([a-zA-Z_\-]+)(\.js)?$/;
	var _exports = [];
	var moduleUrls = {};
	var _loadingFromUrl;
	var i;
	function findModule(name) {
		// Retrieve module by index 0 = first, etc
		if(moduleUrls[name] !== undefined) return moduleUrls[name];
		if(_exports[name] !== undefined) return _exports[name];
		// retrive module by function name: module.exports = function name()
		var len = _exports.length;
		for(i = 0; i < len; i++) if(_exports[i].name === name) return _exports[i];
		// retrive module by exported key: module.exports[name] = exportedValue
		for(i = 0; i < len; i++) if(_exports[i][name] !== undefined) return _exports[i][name];
		if(scope[name] !== undefined) return scope[name];
		return false;
	}
	var _module = Object.create({}, {
		get: {
			value: function(name) {
				var module;
				module = findModule(name);
				if(module === false && name.match(RE_MODULEFILE) !== null) {
					module = findModule(name.replace(RE_MODULEFILE, '$1'));
				}
				if(module === false) throw new Error('Module "'+name+'" not found');
				return module;
			},
			writeable: false,
			enumerable: true,
			configurable: false
		},
		exports: {
			set: function(val) {
				_exports.push(val);
				if(_loadingFromUrl !== undefined) {
					moduleUrls[_loadingFromUrl] = val;
				}
			},
			get: function() {
				if(_exports.length === 0) _exports.push({});
				return _exports[_exports.length-1];
			},
			writeable: false,
			enumerable: true,
			configurable: false
		},
		loadFromUrl: {value: function(url) {
			if(typeof url === 'string') {
				return fetch(url)
				.then(function(res) { return res.text(); })
				.then(function(scriptText) {
	 				var scriptTag = document.createElement('script');
					scriptTag.text = scriptText;
					_loadingFromUrl = url;
					document.head.appendChild(scriptTag);
					_loadingFromUrl = undefined;
				});
			} else
			if(Array.isArray(url)) {
				var p;
				url.forEach(function(url) {
					if(p === undefined) {
						p = _module.loadFromUrl(url);
					} else {
						p = p.then(function() { return _module.loadFromUrl(url); });
					}
				});
				return p;
			}
		}}
	});
	var _require = function require(name) {
		return _module.get(name);
	};

	// Apply module properties to current scope
	Object.defineProperties(scope, {
		module: {
			get: function() { return _module; },
			set: function(val) { console.error('module.set();'); },
			writeable: false, enumerable: true, configurable: false
		},
		exports: {
			get: function() { return _module.exports; },
			set: function(val) { console.error('exports.set();'); },
			writeable: false, enumerable: true, configurable: false
		},
		require: {
			get: function() { return _require; },
			set: function(val) { console.error('require.set();'); },
			writeable: false, enumerable: true, configurable: false
		}
	});

})(this, typeof module === 'undefined'?undefined:module, typeof require === 'undefined'?undefined:require);