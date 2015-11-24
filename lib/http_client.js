/*
 * http_client.js: Http client for influxdb
 *
 * (C) 2015 Brandon Hamilton
 * MIT LICENCE
 *
 */

'use strict';

var http = require('http');

var HTTPClient = function(options) {
  options = options || {}
  this.host = options.host || '127.0.0.1';
  this.port = options.port || 8086;
  this.database = options.database;
  this.username = options.username;
  this.password = options.password;
  if (options.precision) {
    if (['n','u','ms','s','m','h'].indexOf(options.precision) < 0) {
      throw new Error('Precision must be one of [n,u,ms,s,m,h]');
    }
    this.precision = options.precision;
  }

  if (options.consistency) {
    if (['one','quorum','all','any'].indexOf(options.consistency) < 0) {
      throw new Error('Consistency must be one of [one,quorum,all,any]');
    }
    this.consistency = options.consistency;
  }
}

HTTPClient.prototype.send = function(buf, offset, length, callback) {
  var self = this;
  var qs = '?db=' + this.database;
  if (this.username) { qs += '&u=' + this.username; }
  if (this.password) { qs += '&p=' + this.password; }
  if (this.precision) { qs += '&precision=' + this.precision; }
  if (this.consistency) { qs += '&consistency=' + this.consistency; }
  var req = http.request({
    hostname: this.host,
    port: this.port,
    path: '/write' + qs,
    method: 'POST',
  }, function(res) {
    if (res.statusCode == 204) {
      return callback();
    }
    switch (res.statusCode) {
      case 200:
        var data = '';
        res.on('data', function (chunk) { data += chunk; });
        res.on('end', function() {
          callback(new Error("Problem with request: " + data));
        });
        break;
      case 401:
        return callback(new Error("Unauthorized user"));
        break;
      case 400:
        return callback(new Error("Invalid syntax"));
        break;
      default:
        return callback(new Error("Unknown response status: " + res.statusCode));
    }
  });
  req.on('error', function(e) { callback(e); });
  req.write(buf.slice(offset, length));
  req.end();
}

HTTPClient.prototype.writePoints = function(batches) {
  for (var i = 0; i < batches.length; i++) {
    var batch = batches[i];
    var buf = new Buffer(batch.join('\n'));
    this.send(buf, 0, buf.length);
  }
}

module.exports = HTTPClient;
