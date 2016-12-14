(function() {
/*jslint node: true */
'use strict';

//require('nodejs-dashboard');
//const jsDir = '../../www/js/';
//var XENO = require(jsDir+'xeno/XENO');
//const assetdata = require(jsDir+'xenocards/assetdata');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const httpProxy = require('http-proxy');
const fetch = require('node-fetch');
const corser = require('corser');

const DEFAULT_PORT = 8970;
const portraitDir = path.join(__dirname, '../../www/portrait/');


function getArgs() {
	var argv = process.argv.join(' '), m;
	var host;
	var port = DEFAULT_PORT;
	m = argv.match(/-p ([0-9]+)/);
	if(m) port = m[1];
	m = argv.match(/-h ([^\s]+)/);
	if(m) host = m[1];
	return {host: host, port: port};
}

const handleError = err => {
	console.error(err);
	process.exit(1);
};

const handleListening = () => console.log('Listening...');

function main() {
	var args = getArgs();
	var opts = {host: args.host, port: args.port};
	console.log('proxy:', opts);
	const app = express();
	const server = http.createServer(app);
	app.use(corser.create());
	app.use((req, res, next) => {
		if(req.url.match(/favicon\.ico$/)) return res.status(404).end();
		next();
	});
	app.use((req, res, next) => {
		const portrait = req.url.replace(/^\/portrait\/(.+)$/, '$1');
		const cacheFile = path.join(portraitDir, portrait);
		fs.stat(cacheFile, (err, stats) => {
			if(err) {
				console.error(err);
				//const portraitUrl = `http://localhost/hsart/${portrait}`;
				const portraitUrl = `https://art.hearthstonejson.com/v1/512x/${portrait}`;
				console.log('Serve from remote: "%s"', portraitUrl);
				fetch(portraitUrl)
				.then(data => {
					const cacheFileStream = fs.createWriteStream(cacheFile);
					data.body.pipe(cacheFileStream);
					data.body.pipe(res);
				});
			} else {
				console.log('Serve from cache: "%s"', cacheFile);
				fs.createReadStream(cacheFile).pipe(res);
			}
		});
	});
	server.listen(opts.port);
	server.on('error', handleError);
	server.on('listening', handleListening);
}

main();

})();