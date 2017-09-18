/*
 * udp_client.js: Http client for influxdb
 *
 * (C) 2015 Brandon Hamilton
 * MIT LICENCE
 *
 */

'use strict';

var dns = require("dns"),
  dgram = require("dgram");

var UDPClient = function(options) {
  options = options || {}
  this.host = options.host || '127.0.0.1';
  this.port = options.port || 8089;
  this.maxPacketSize = options.maxPacketSize || 1024;
  this.callback = options.callback;
}

UDPClient.prototype.send = function(buf, offset, length, callback) {
  callback = callback || this.callback;
  var self = this;
  dns.lookup(this.host, function(err, address, family) {
    if (err) { if (typeof(callback) == 'function') {  callback(err); } else { console.log(e); }; return; }
    var socket = dgram.createSocket(family == 4 ? "udp4" : "udp6");
    socket.send(buf, offset, length, self.port, address, function(err) {
      if (err) { if (typeof(callback) == 'function') {  callback(err); } else { console.log(e); }; return; }
      socket.close();
    });
  });
}

UDPClient.prototype.writePoints = function(batches) {
  var packets = [];
  for (var i = 0; i < batches.length; i++) {
    var batch = batches[i];
    var buf = new Buffer(batch[0]);
    for (var l = 1; l < batch.length; l++) {
      var line = batch[l];
      var str = '\n' + line;
      if (buf.length + Buffer.byteLength(str) <= this.maxPacketSize) {
        buf = Buffer.concat([buf, new Buffer(str)])
      } else {
        packets.push(buf);
        buf = new Buffer(line);
      }
    }
    packets.push(buf);
  }

  for (var p = 0; p < packets.length; p++) {
    var packet = packets[p];
    this.send(packet, 0, packet.length);
  }
}

module.exports = UDPClient;
