(function() {
'use strict';
var uuid = require('portable-uuid');


function Network() {
}
Network.generateId = function() {
	//return uuid();
	Network.nextId = Network.nextId || 1;
	return Network.nextId++;
};
Network.prototype = Object.create(null);
Network.prototype.constructor = Network;


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = Network;
}

})();