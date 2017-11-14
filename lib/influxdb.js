/*
 * influx.js: InfluxDB interface
 *
 * (C) 2015 Brandon Hamilton
 * MIT LICENCE
 *
 */

'use strict';

var httpClient = require('./http_client'),
     udpClient = require('./udp_client');

function escapeMetadata(str) {
  return str.replace(/ /g, '\\ ').replace(/,/g, '\\,');
}

function escapeString(str) {
  return str.replace(/"/g, '\\\"');
}

function keySort(a, b) {
  return (a < b) ? -1 : (a > b ? 1: 0);
}

function createBatches(points, size) {
  if (points.length < 1) {
    return [];
  }
  if (points.length <= size) {
    return [points];
  }
  var batches = [];
  var batch;
  var c = 0;
  var index = 0;
  while (true) {
    index = c * size;
    batch = points.slice(index, index + size);
    if (batch.length == 0) {
      break;
    }
    batches.push(batch);
    c++;
  }
  return batches;
}

function serialize(key, tags, timestamp, fields) {
  var line = escapeMetadata(key);

  Object.keys(tags).sort(keySort).forEach(function(key) {
    line += ',' + escapeMetadata(key) + '=' + escapeMetadata(tags[key]);
  });

  var notFirst = false;
  Object.keys(fields).sort(keySort).forEach(function(key) {
    var value = fields[key];
    if (value.value == null || typeof value.value == 'undefined') {
      return;
    }
    var stringValue;
    switch(value.type) {
      case 'integer':
        stringValue = value.value.toString() + 'i';
        break;
      case 'float':
        stringValue = value.value.toString();
        break;
      case 'boolean':
        stringValue = value.value ? 't' : 'f';
        break;
      case 'string':
        stringValue = '\"' + escapeString(value.value) + '\"';
        break;
      default:
        throw new Error('Unable to serialize value of field "' + key + '"');
    }
    if (notFirst) {
      line += ',' + escapeMetadata(key) + '=' + stringValue;
    } else {
      line += ' ' + escapeMetadata(key) + '=' + stringValue;
      notFirst = true;
    }
  });
  if (timestamp) {
    line += ' ' + timestamp;
  }
  return line;
}

var Influx = function(options) {
  this.precision = options.precision || 'n';
  if (['n','u','ms','s','m','h'].indexOf(this.precision) < 0) {
    throw new Error('Precision must be one of [n,u,ms,s,m,h]');
  }
  this.protocol = options.protocol || 'udp';
  if (['udp', 'http', 'https'].indexOf(this.protocol)< 0) {
    throw new Error('Protocol must be one of [udp,http]');
  }
  if (this.protocol == 'udp' && this.precision !== 'n') {
    this.precisionMultiplier = {
      'u' : 1000,
      'ms': 1000000,
      's' : 1000000000,
      'm' : 60000000000,
      'h' : 3600000000000
    }[this.precision];
  } else {
    this.precisionMultiplier = 1;
  }
  this.client = this.protocol == 'udp' ? new udpClient(options) : new httpClient(options);
  this.batchSize = options.batchSize || 100;
  this.points = [];
}

Influx.prototype.addPoint = function(key, tags, timestamp, fields) {
  this.points.push(serialize(key, tags, timestamp ? timestamp*this.precisionMultiplier : undefined, fields));
}

Influx.prototype.write = function() {
  var batches = createBatches(this.points, this.batchSize);
  this.points = [];
  this.client.writePoints(batches);
}

module.exports = Influx;
