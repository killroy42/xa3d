(function() {
/*jslint node: true */
'use strict';

/*
Potential pit-falls:
	- .once() uses property on listener object
*/

function EventDispatcher() {
	var self = this;
	var _listeners;
	var _boundHandlers;
	function addEventListener(type, listener) {
		if(typeof type !== 'string' || typeof listener !== 'function') {
			throw new Error('Invalid arguments to EventDispatcher.addEventListener(type, listener)');
		}
		if(_listeners === undefined) _listeners = {};
		if(_listeners[type] === undefined) _listeners[type] = [];
		_listeners[type].push(listener);
		return self;
	}
	function addEventListenerOnce(type, listener) {
		addEventListener(type, listener);
		listener.isOnceListner = true;
		return self;
	}
	function removeEventListener(type, listener) {
		if(_listeners === undefined) return self;
		if(_listeners[type] === undefined) return self;
		if(listener === undefined) { // Remove all listernes of type
			_listeners[type].length = 0;
			return self;
		}
		var idx = _listeners[type].indexOf(listener);
		if(idx !== -1) {
			_listeners[type].splice(idx, 1);
		}
		return self;
	}
	function applyEventListeners(listeners, remove) {
		if(typeof listeners !== 'object') {
			throw new Error('Invalid arguments to EventDispatcher.applyEventListeners(listeners, remove)');
		}
		var applyEventListener = addEventListener;
		if(remove === true) applyEventListener = removeEventListener;
		var keys = Object.keys(listeners);
		for(var i = 0, l = keys.length; i < l; i++) applyEventListener(keys[i], listeners[keys[i]]);
		return self;
	}
	function removeEventListeners(listeners) { applyEventListeners(listeners, true); }
	function dispatchEvent(event) {
		var type, args;
		if(_listeners === undefined) return false;
		if(typeof event === 'object' && typeof event.type === 'string') {
			type = event.type;
			args = [event];
		} else if(typeof event === 'string') {
			type = event;
			args = Array.prototype.slice.call(arguments, 1);
		} else throw new Error('Invalid arguments to EventDispatcher.dispatchEvent(...)');
		var typeListeners = _listeners[type];
		if(typeListeners === undefined) return false;
		var len = typeListeners.length;
		if(len === 0) return false;
		var execListeners = [], i, listener;
		// Cache listeners array to avoid issues with removal
		for(i = 0; i < len; i++) {
			execListeners[i] = typeListeners[i];
		}
		for(i = 0; i < len; i++) {
			listener = execListeners[i];
			listener.apply(self, args); // Execute event listener
			if(listener.isOnceListener === true) {
				removeEventListener(type, listener);
			}
		}
		return true;
	}
	function getEventListeners(type) {
		if(_listeners === undefined) return [];
		if(type === undefined) return _listeners;
		return _listeners[type];
	}
	function hasEventListener(type, listener) {
		if(_listeners === undefined) return false;
		if(_listeners[type] !== undefined) return false;
		if(_listeners[type].indexOf(listener) === -1) return false;
		return true;
	}
	function bindHandler(func) {
		if(_boundHandlers === undefined) _boundHandlers = {};
		var boundHandler = _boundHandlers[func];
		if(boundHandler === undefined) {
			boundHandler = function() { func.apply(self, arguments); };
			_boundHandlers[func] = boundHandler;
		}
		return boundHandler;
	}
	function delegate(type, transformFunc) {
		return function() {
			var args = Array.prototype.slice.apply(arguments);
			if(typeof transformFunc !== 'undefined') {
				args = [transformFunc.apply(self, args)];
			}
			args.unshift(type);
			self.dispatchEvent.apply(self, args);
		};
	}
	Object.defineProperties(self, {
		// DOM naming convention
		addEventListener: { value: addEventListener, enumerable: true},
		removeEventListener: { value: removeEventListener, enumerable: true},
		dispatchEvent: { value: dispatchEvent, enumerable: true},
		// jQuery naming convention
		on: { value: addEventListener, enumerable: true},
		once: { value: addEventListenerOnce, enumerable: true},
		off: { value: removeEventListener, enumerable: true},
		trigger: { value: dispatchEvent, enumerable: true},
		// Additional
		addEventListeners: { value: applyEventListeners, enumerable: true},
		removeEventListeners: { value: removeEventListeners, enumerable: true},
		hasEventListener: { value: hasEventListener, enumerable: true},
		getEventListeners: { value: getEventListeners, enumerable: true},
		bindHandler: { value: bindHandler, enumerable: true},
		delegate: { value: delegate, enumerable: true},
	});
}
EventDispatcher.mixin = function(obj) {
	EventDispatcher.apply(obj);
	return obj;
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = EventDispatcher;
}

})();