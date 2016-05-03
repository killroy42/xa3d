var TIMEOUT = 100;
var ws = new WebSocket('ws://127.0.0.1:7890/');
ws.addEventListener('open', function() {
	console.info('Reloader: Socket open');
	ws.addEventListener('close', function() {
		console.info('Reloader: Socket closed');
		setTimeout(function() {
			console.info('Reloader: Reloading...');
			document.location.reload(true);
		}, TIMEOUT);
	});
});