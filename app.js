
var child_process = require('child_process');

var npmCmd = (require('os').platform() === 'win32')?'npm.cmd':'npm';

function exec(cmd) {
	cmd = cmd.split(/\s+/);
	var p = child_process.spawn(cmd.shift(), cmd, {cwd: __dirname, stdio: 'pipe'});
	p.stdout.pipe(process.stdout);
	p.stderr.pipe(process.stderr);
	return p;
}

function runDelayed(cmd, delay, pause) {
	if(delay === undefined) delay = 200;
	if(pause === undefined) pause = 0;
	return function() {
		return new Promise(function(resolve, reject) {
			var logText = 'Executing: '+cmd;
			console.time(logText);
			setTimeout(function() {
				exec(cmd);
				setTimeout(function() {
					console.timeEnd(logText);
					resolve();
				}, pause);
			}, delay);
		});
	};
}

console.info('Launching reloaderserver and HTTP server:');
return Promise.resolve()
	.then(runDelayed('nodemon.cmd src/server/portraitproxy/server.js -- -p 9870', 0, 0))
	.then(runDelayed('nodemon.cmd src/server/xenonetwork/server.js -- -p 82', 0, 100))
	.then(runDelayed('http-server.cmd ./src/www -p 80 --cors --utc --silent'))
	.then(runDelayed('nodemon.cmd src/server/reloader/server.js -- -p 7890', 0, 200))
	//.then(runDelayed('http-server.cmd ./src/www -p 80 --cors --utc --silent --proxy http://127.0.0.1:8904'))
	//.then(runDelayed('http-server.cmd ./src/www -p 8888 --cors --utc --silent --proxy http://a.tile.openstreetmap.org'))
	//exec('nodemon.cmd src/server/objectserver/server.js -- -p 81');
	;