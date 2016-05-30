
var child_process = require('child_process');

var npmCmd = (require('os').platform() === 'win32')?'npm.cmd':'npm';
var npmCmd = (require('os').platform() === 'win32')?'npm.cmd':'npm';
var reloaderNpm = 'reloader';
var serverNpm = 'server';

function exec(cmd) {
	cmd = cmd.split(/\s+/);
	var p = child_process.spawn(cmd.shift(), cmd, {cwd: __dirname, stdio: 'pipe'});
	p.stdout.pipe(process.stdout);
	p.stderr.pipe(process.stderr);
	return p;
}

console.info('Launching reloaderserver and HTTP server:');
//exec(npmCmd+' run '+reloaderNpm);
//exec(npmCmd+' run '+serverNpm);
exec('http-server.cmd ./src/www -p 80 --cors --utc --silent');
//exec('http-server.cmd ./src/www -a 127.0.0.1 -p 80 --cors --utc');
exec('nodemon.cmd src/server/reloader/server.js -- -p 7890');
//exec('nodemon.cmd src/server/objectserver/server.js -- -p 81');
exec('nodemon.cmd src/server/xenonetwork/server.js -- -p 82');