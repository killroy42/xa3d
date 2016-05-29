(function() {
/*jslint node: true */
'use strict';


function HandlerBinder() {
	var self = this;
	var _boundHandlers;
	function bindHandler(func) {
		if(_boundHandlers === undefined) _boundHandlers = [];
		var idx = _boundHandlers.indexOf(func);
		if(idx !== -1) return _boundHandlers[idx];
		var boundHandler = function() { func.apply(self, arguments); };
		_boundHandlers.push(boundHandler);
		return boundHandler;
	}
	Object.defineProperties(this, {
		bindHandler: { value: bindHandler, enumerable: true}
	});
}


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = HandlerBinder;
}

})();