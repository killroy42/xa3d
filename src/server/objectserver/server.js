
(function() {
/*jslint node: true */
'use strict';

var http = require('http');
var ObjectServer = require('./ObjectServer.js');

var app = http.createServer();
var port = 81;
var cardServer = new ObjectServer();


app.listen(port, function () {
	cardServer.listen(app);
	console.log('Card server listining on port %s', port);
});
})();