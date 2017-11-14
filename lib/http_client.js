/*
 * http_client.js: Http client for influxdb
 *
 * (C) 2015 Brandon Hamilton
 * MIT LICENCE
 *
 */

'use strict';

var http = require('http');
var https = require('https');

var HTTPClient = function(options) {
  options = options || {}
  this.host = options.host || '127.0.0.1';
  this.port = options.port || 8086;
  this.database = options.database;
  this.username = options.username;
  this.password = options.password;
  this.precision = options.precision;
  this.timeout = options.httpTimeout || 200;
  this.callback = options.callback;
  this.httpModule = options.protocol == 'https' ? https : http;
  if (options.consistency) {
    if (['one','quorum','all','any'].indexOf(options.consistency) < 0) {
      throw new Error('Consistency must be one of [one,quorum,all,any]');
    }
    this.consistency = options.consistency;
  }
}

HTTPClient.prototype.send = function(buf, offset, length, callback) {
  callback = callback || this.callback;
  var self = this;
  var qs = '?db=' + this.database;
  if (this.username) { qs += '&u=' + this.username; }
  if (this.password) { qs += '&p=' + this.password; }
  if (this.precision) { qs += '&precision=' + this.precision; }
  if (this.consistency) { qs += '&consistency=' + this.consistency; }
  var req = this.httpModule.request({
    hostname: this.host,
    port: this.port,
    path: '/write' + qs,
    timeout: this.timeout,
    method: 'POST',
  }, function(res) {
    if (res.statusCode == 204) {
      if (typeof(callback) == 'function') {
        callback();
      }
      return;
    }
    switch (res.statusCode) {
      case 200:
        handleSendError(res, "Problem with request", callback);
        break;
      case 401:
        handleSendError(res, "Unauthorized user", callback);
        return;
      case 400:
        handleSendError(res, "Invalid syntax in: " + buf.slice(offset, length), callback);
        return;
      default:
        handleSendError(res, "Unknown response status: " + res.statusCode, callback);
        return;
    }
  });
  req.on('error', function(e) { if (typeof(callback) == 'function') { callback(e); } else { console.log(e); } });
  req.write(buf.slice(offset, length));
  req.end();
}

function handleSendError(res, errorMessage, callback) {
    var data = '';
    res.on('data', function (chunk) { data += chunk; });

    res.on('end', function() {
    if (typeof(callback) == 'function') {
        callback(new Error(errorMessage + " Response: " + data));
    } else {
        console.log(errorMessage  + " Response: " + data);
    }
  });
}

HTTPClient.prototype.writePoints = function(batches) {
  for (var i = 0; i < batches.length; i++) {
    var batch = batches[i];
    var buf = new Buffer(batch.join('\n'));
    this.send(buf, 0, buf.length);
  }
}

module.exports = HTTPClient;
