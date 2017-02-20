(function() {
'use strict';

var ws = require('ws');
var WebSocketServer = ws.Server;

var ConnectionServer = require('./ConnectionServer');
var WebSocketConnection = require('./WebSocketConnection');


function WebSocketConnectionServer() {
	ConnectionServer.apply(this);
	this.stats = {
		collectInterval: 50,
		reportInterval: 5000,
		count: 20+1,
		intervals: [],
		getTime: function() {
			var hrt = process.hrtime();
			return hrt[0] * 1e3 + hrt[1] / 1e6;
		},
		start: function() {
		},
		receivedMsg: function() {
			this.intervals[this.intervals.length - 1].rcvd++;
		},
		startCollecting: function() {
			var stats = this;
			stats.intervals.push({t: stats.getTime(), rcvd: 0});
			stats.collectIntervalId = setInterval(function collectStats() {
				stats.intervals.push({t: stats.getTime(), rcvd: 0});
				if(stats.intervals.length > stats.count) stats.intervals.shift();
			}, stats.collectInterval);
		},
		getTotal: function() {
			return this.intervals.slice(1)
				.map(function(stat, idx) { return stat.rcvd; })
				.reduce(function(prev, curr, idx, arr) { return prev + curr; }, 0);
		},
		getTotalTime: function() {
			return this.intervals[this.intervals.length - 1].t - this.intervals[0].t;
		}
	};
}
WebSocketConnectionServer.getTimer = function() {
	var hrt = process.hrtime();
	return hrt[0] * 1e3 + hrt[1] / 1e6;
};
WebSocketConnectionServer.prototype = Object.create(ConnectionServer.prototype);
WebSocketConnectionServer.prototype.constructor = WebSocketConnectionServer;
WebSocketConnectionServer.prototype.listen = function(opts) {
	//console.info('WebSocketConnectionServer.listen(%s);', JSON.stringify(opts));
	var self = this;
	var stats = this.stats;
	var wss = new WebSocketServer({host: opts.host, port: opts.port});
	wss.on('connection', function connection(socket) {
		// Add browser compatible API: removeEventListener
		if(socket.removeEventListener === undefined && typeof socket.removeListener === 'function') {
			socket.removeEventListener = socket.removeListener;
		}
		socket.on('message', function(e) { stats.receivedMsg(); });
		self.handleConnection(new WebSocketConnection().attach(socket));
	});
	stats.startCollecting();
	
	//setInterval(() => console.log('%s msg/s', (stats.getTotal() / stats.getTotalTime() * 1000).toFixed(1)), stats.reportInterval);
	
	return this;
};


// export in common js
if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = WebSocketConnectionServer;
}

})();