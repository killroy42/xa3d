(function() {
'use strict';

function XENO() {}
XENO.EventDispatcher = require('./EventDispatcher');
XENO.Connection = require('./Connection');
XENO.WebSocketConnection = require('./WebSocketConnection');
XENO.ConnectionServer = require('./ConnectionServer');


if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = XENO;
}

})();