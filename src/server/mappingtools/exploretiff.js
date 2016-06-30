
var http = require('http');
var url = require('url');
var querystring = require('querystring');
var thenifyAll = require('thenify-all');
var fs = thenifyAll(require('fs-extra'));
var gm = require('gm');
var child_process = require('child_process');


function openF(fn) {
	return new Promise(function(resolve, reject) {
		fs.open(fn, 'r', function(err, fd) {
			if(err) return reject(err);
			resolve(fd);
		});
	});
}

function closeF(fd) {
	return new Promise(function(resolve, reject) {
		fs.close(fd, function(err) {
			if(err) return reject(err);
			resolve(fd);
		});
	});
}

function writeF(fn, data) {
	return new Promise(function(resolve, reject) {
		fs.open(fn, 'w', function(err, fd) {
			fs.write(fd, data, 0, 'utf8', function(err, written, string) {
				if(err) return reject(err);
				resolve();
			});
		});
	});
}

function readF(fd, offset, len) {
	//console.info('readF(fd, %s, %s);', offset, len);
	return new Promise(function(resolve, reject) {
		var floats = new Float32Array(len);
		var buffer = new Buffer(floats.buffer);
		fs.read(fd, buffer, 0, len * 4, offset * 4, function(err, bytesRead, buffer) {
			if(err) return reject(err);
			resolve(floats);
		});
	});
}

function exec(cmd, done) {
	cmd = cmd.split(/\s+/);
	var p = child_process.spawn(cmd.shift(), cmd, {cwd: __dirname, stdio: 'pipe'});
	p.stdout.pipe(process.stdout);
	p.stderr.pipe(process.stderr);
	p.on('close', done);
	return p;
}

function fetchRegion(fd, x, y, w, h, rowSize) {
	console.info('fetchRegion(fd, %s, %s, %s, %s, %s);', x, y, w, h, rowSize);
	var floats = new Float32Array(w*h);
	var buffer = new Buffer(floats.buffer);
	function readRow(row) {
		var fOffset = (y + row) * rowSize + x;
		return fs.read(fd, buffer, row * w * 4, w * 4, fOffset * 4);
	}
	var rows = []; for(var i = 0; i < h; i++) rows.push(i);
	return Promise.all(rows.map(readRow)).then(function() { return buffer; });
}

function initServer(host, port) {
	//console.info('initServer();');
	return new Promise(function(resolve, reject) {
		var server = http.createServer()
		.on('error', reject)
		.listen(port, host, function() { resolve(server); });
	});
}

function createRequestHandler(opts) {
	return function handleReq(req, resp) {
		var _url = url.parse(req.url);
		if(_url.pathname !== '/map') {
			resp.writeHead(404);
			resp.end();
			return;
		}
		console.log('REQUEST '+req.url);
		console.time('completed');
		var qs = querystring.parse(_url.query);
		var x = parseInt(qs.x || opts.defX);
		var y = parseInt(qs.y || opts.defY);
		var w = parseInt(Math.min(qs.w || opts.defW, 1000));
		var h = parseInt(Math.min(qs.h || opts.defH, 1000));
		console.time(' > fetch region');
		return fetchRegion(opts.fd, x, y, w, h, opts.totalW)
		.then(function(res) {
			console.timeEnd(' > fetch region');

			console.time(' > calc min/max');
			var floats = new Float32Array(res.buffer, 0, res.length / 4);
			var min = Number.POSITIVE_INFINITY;
			var max = Number.NEGATIVE_INFINITY;
			var len = floats.length; while(len--) {
				min = Math.min(min, floats[len]);
				max = Math.max(max, floats[len]);
			}
			console.timeEnd(' > calc min/max');

			console.time(' > scale');
			console.log('min/max/scaled:', min, max, max * 217 / 256);
			//max = max * 217 / 256;
			//max = max * 128 / 256;
			len = floats.length; while(len--) {
				//floats[len] = (floats[len] - min) / (max - min);
				floats[len] = Math.max(0, Math.min(1, floats[len] / max));
			}
			console.timeEnd(' > scale');

			/*
				console.time(' > calc histogram');
				var histogram = {};
				len = 256; while(len--) histogram[len] = 0;
				min = Number.POSITIVE_INFINITY; max = Number.NEGATIVE_INFINITY;
				len = floats.length; while(len--) {
					min = Math.min(min, floats[len]);
					max = Math.max(max, floats[len]);
					histogram[Math.floor(floats[len]*255)]++;
				}
				console.timeEnd(' > calc histogram');
			*/

			/*
				var tot = 0;
				len = 256; while(len--) {
					if(histogram[len] !== undefined) {
						tot += histogram[len];
						//console.log(len, tot, floats.length, (tot / (floats.length - histogram[0])) * 100);
					}
				}
			*/

			console.time(' > Create 8-bit buffer');
			var buf = new Buffer(floats.length);
			len = floats.length; while(len--) {
				buf[len] = Math.floor(floats[len] * 255);
			}
			res = buf;
			console.timeEnd(' > Create 8-bit buffer');

			console.time(' > write cropped raw');
			fs.writeFile('map.raw', buf, function(err) {
				if(err) console.error(err);
				console.timeEnd(' > write cropped raw');
				console.time(' > create jpg');
				exec('gm convert -depth 8 -size '+w+'x'+h+'+0 gray:map.raw -quality 100 map.jpg', function() {
					fs.readFile('map.jpg', function(err, data) {
						console.timeEnd(' > create jpg');
						resp.writeHead(200, {
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Methods': 'GET',
							'Access-Control-Allow-Headers': 'Content-Type',
							'Access-Control-Max-Age': 86400,
							//'Content-Type': 'application/octet-stream',
							'Content-Type': 'image/jpg',
							'Content-Length': data.length,
						});
						resp.write(data);
						resp.end();
						console.timeEnd('completed');
					});
				});
			});

			/*
			var img = gm(buf, 'map.raw');
			img.format(function(err, format) {
				console.error(err);
				console.dir(format);
			});
			*/
			//console.log('size:', img.size);
			//console.log('format:', img.format);
			//console.log('depth:', img.depth);
			//console.log('color:', img.color);

		})
		.catch(function(err) {
			console.error('Error:', err);
			throw err;
		});
	};
}


var config = {
	host: '0.0.0.0',
	//host: undefined,
	port: 8900,
	fn: 'E:/Data/gis/eudem_dem_3035_europe-sicily_crop3.raw',
	defX: 9960, defY: 13690,
	defW: 100, defH: 100,
	totalW: 20776, totalH: 16476
};
/*
var config = {
	host: '0.0.0.0',
	port: 8900,
	fn: 'E:/Data/gis/eudem_dem_3035_europe-malta_02.raw',
	defX: 800, defY: 800,
	defW: 100, defH: 100,
	totalW: 1500, totalH: 1300
};
*/

function main() {
	return Promise.resolve()
	.then(function() { return fs.open(config.fn, 'r'); })
	.then(function(res) { config.fd = res; })
	.then(function(res) { return initServer(config.host, config.port); })
	.then(function(server) {
		console.log('listening on %s:%s', server.address().address, server.address().port);
		server.on('request', createRequestHandler(config));
	})
	.catch(function(err) {
		console.error('Error:', err);
		throw err;
	});
}

main();