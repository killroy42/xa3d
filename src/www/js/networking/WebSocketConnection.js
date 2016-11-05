(function() {

const Connection = require('./Connection');

class WebSocketConnection extends Connection {
	connect({host, port}) {
		//console.info('WebSocketConnection.connect(%s);', JSON.stringify(opts));
		super.connect();
		host = host || document.location.host;
		port = port || WebSocketConnection.DEFAULT_PORT;
		const url = 'ws://'+host+':'+port;
		if(this.socket !== undefined) throw new Error('Socket already connected');
		const ws = new WebSocket(url);
		//ws.addEventListener('open', function(e) { console.log(' >> ws.open'); });
		//ws.addEventListener('close', function(e) { console.log(' >> ws.close'); });
		//if(ws.on) ws.on('open', function(e) { console.log(' >> ws.on open'); });
		//if(ws.on) ws.on('close', function(e) { console.log(' >> ws.on close'); });
		this.attach(ws);
		return this;
	}
	disconnect(reason) {
		//console.info('WebSocketConnection.disconnect();');
		super.disconnect();
		if(this.socket === undefined) throw new Error('Socket not connected');
		this.socket.close();
		return this;
	}
	attach(ws) {
		//console.info('WebSocketConnection.attach(ws);');
		super.attach();
		this.socket = ws;
		const handleOpen = this.delegate('connected');
		const handleMessage = this.delegate('message', ({data}) => data);
		const handleError = this.delegate('error');
		const handleClose = ({reason}) => {
			if(typeof ws.removeAllListeners === 'function') {
				ws.removeAllListeners();
			} else {
				ws.removeEventListener('open', handleOpen);
				ws.removeEventListener('message', handleMessage);
				ws.removeEventListener('error', handleError);
				ws.removeEventListener('close', handleClose);
			}
			this.socket = undefined;
			this.isConnected = false;
			this.dispatchEvent('disconnected', reason);
		};
		ws.addEventListener('open', handleOpen);
		ws.addEventListener('message', handleMessage);
		ws.addEventListener('error', handleError);
		ws.addEventListener('close', handleClose);
		return this;
	}
	send(data) {
		//console.info('WebSocketConnection.send(%s);', JSON.stringify(data));
		const {socket} = this;
		if(socket === undefined || socket.readyState !== 1) {
			console.error('E(Socket not open) @ WebSocketConnection.send("%s")', data);
			if(socket) console.log('  readyState:', socket.readyState);
			return;
		}
		socket.send(data);
	}	
}
WebSocketConnection.DEFAULT_PORT = 8080;

if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = WebSocketConnection;
}
})();