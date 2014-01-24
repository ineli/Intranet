var app		= require('express')();
var fs		= require('fs');
var request = require('request');
var path	= require('path');
var _dev			= true;
var _phpServerUrl	= 'http://localhost:8888';

/* Log all input */
exports.log_input = function(req, res, next) {
	console.log('%s %s', req.method, req.url);
	next();
};

/* Load file with file's caching from php server */
exports.loadFile = function(req, httpRes) {
	// Prepare request's path and file's path
	url = req.url;
	filePath = path.dirname(require.main.filename)+'/html'+url;
	if (pathParsed = url.match(/^(.*)(.html)$/)) { // Convert .html -> .php
		requestPath = pathParsed[1]+".php";
	} else {
		requestPath = url;
	}
	// Prepare request's parameters if we have to send a request
	requestParam = {
		url	: _phpServerUrl+requestPath,
		encoding	: null,
	};
	// fs.exist check the existance of the requested file
	fs.exists(filePath, function(exists) {
		if (_dev) { // server is on Developpement mode
			if (exists) {
				// Get file Information for cache date; stats.atime = file's Add Dates
				stats = fs.statSync(filePath);
				requestParam.headers = {
					'If-None-Match': '*',
					'If-Modified-Since':new Date(stats.atime).toUTCString()
				};
			}
			//Send a request with|out cache 
			request(requestParam, function(err, res, buffer) {
				if (err == null) {
					if (res.statusCode === 304) {
						httpRes.sendfile(filePath);
					} else if (res.statusCode === 200) {
						// Write file before sending
						fs.writeFile(filePath, buffer, function(err) { 
							httpRes.sendfile(filePath);
						});
					}
				} else {
					console.log('Error with path: '+requestParam.url);
				}
			});
		} else { // Server is on Production Mode
			if (!exists) { // We don't have this file, request it from php server
				request(requestParam, function(err, res, buffer) {
					if (err == null) {
						// Write file before sending
						fs.writeFile(filePath, buffer, function(err) {
							httpRes.sendfile(filePath);
						});
					} else {
						console.log('Error with path: '+requestParam.url);
					}
				});
			} else {
				httpRes.sendfile(filePath);
			}
		}
	});
};