(function() {
'use strict';
var uuid = require('portable-uuid');


function Network() {
}
Network.MSG_CLIENT_INIT = 'client.init';
Network.MSG_NETID_CREATE = 'netid.create';
Network.MSG_NETID_CREATE_PEER = 'netid.create.peer';
Network.MSG_NETID_DESTROY = 'netid.destroy';
Network.MSG_NETID_MSG = 'netid.msg';
Network.MSG_NETID_MSG_PEERS = 'netid.msg.peers';
Network.MSG_BP_CREATE = 'bp.create';
Network.generateId = function() {
	//return uuid();
	Network.nextId = Network.nextId || 1;
	return Network.nextId++;
};
Network.prototype = Object.create(null);
Network.prototype.constructor = Network;
Network.PeerType = {
	DISCONNECTED: 'DISCONNECTED',
	CLIENT: 'CLIENT',
	SERVER: 'SERVER',
	PROXY: 'PROXY',
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = Network;
}

})();