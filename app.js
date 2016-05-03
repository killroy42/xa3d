
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
exec('http-server.cmd ./src/www -p 80 --cors');
exec('nodemon.cmd src/server/reloaderserver.js');