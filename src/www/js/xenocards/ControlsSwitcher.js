(function() {
	/* jshint validthis: true */
	'use strict';
	var THREE = require('THREE');


	function ControlsSwitcher(controls) {
		function dragstartHandler(e) { controls.enabled = false; }
		function dragfinishHandler(e) { controls.enabled = true; }
		var _mouseHandler;
		this.attach = function(mouseHandler) {
			_mouseHandler = mouseHandler;
			_mouseHandler.addEventListener('dragstart', dragstartHandler);
			_mouseHandler.addEventListener('dragfinish', dragfinishHandler);
			return this;
		};
		this.detach = function() {
			_mouseHandler.removeEventListener('dragstart', dragstartHandler);
			_mouseHandler.removeEventListener('dragfinish', dragfinishHandler);
			return this;
		};
	}


	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = {};
		module.exports.ControlsSwitcher = ControlsSwitcher;
	}
})();