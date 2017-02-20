(function() {
	var RELOADER_TIMEOUT = 100;
	var wsUrl = 'ws://'+document.location.host+':7890/';
	var ws = new WebSocket(wsUrl);
	ws.addEventListener('open', function() {
		console.info('Reloader: Socket open at "%s"', wsUrl);
		ws.addEventListener('close', function() {
			console.info('Reloader: Socket closed');
			setTimeout(function() {
				console.info('Reloader: Reloading...');
				document.location.reload(true);
			}, RELOADER_TIMEOUT);
		});
	});
	ws.addEventListener('error', function(err) {
		console.error('Error in reloader websocket');
		console.log(err);
		ws.close();
	});
})();