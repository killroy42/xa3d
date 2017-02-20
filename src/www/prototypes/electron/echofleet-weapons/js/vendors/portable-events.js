/*!
 * PortableEvents v2.0.0 | MIT License | github.com/killroy42
 *
 */
(function() {
/*jslint node: true */
'use strict';

function PortableEvents() {
	var self = this;
	var _listeners;
	function addEventListener(type, listener) {
		if(typeof type !== 'string' || typeof listener !== 'function') {
			throw new Error('Invalid arguments to EventDispatcher.addEventListener(type, listener)');
		}
		if(_listeners === undefined) _listeners = {};
		if(_listeners[type] === undefined) _listeners[type] = [];
		_listeners[type].push(listener);
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
		var execListeners = [], i;
		// Cache listeners array to avoid issues with removal
		for(i = 0; i < len; i++) {
			execListeners[i] = typeListeners[i];
		}
		for(i = 0; i < len; i++) {
			execListeners[i].apply(self, args);
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
		if(listeners[type].indexOf(listener) === -1) return false;
		return true;
	}
	Object.defineProperties(self, {
		// DOM naming convention
		addEventListener: { value: addEventListener, enumerable: true},
		removeEventListener: { value: removeEventListener, enumerable: true},
		dispatchEvent: { value: dispatchEvent, enumerable: true},
		// jQuery naming convention
		on: { value: addEventListener, enumerable: true},
		off: { value: removeEventListener, enumerable: true},
		trigger: { value: dispatchEvent, enumerable: true},

		hasEventListener: { value: hasEventListener, enumerable: true},
		getEventListeners: { value: getEventListeners, enumerable: true},
	});
}
PortableEvents.mixin = function(obj) {
	PortableEvents.apply(obj);
	return obj;
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports.PortableEvents = PortableEvents;
	module.exports['portable-events'] = PortableEvents;
}

})();