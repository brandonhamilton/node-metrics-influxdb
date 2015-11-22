/*
 * influxdbreporter.js: InfluxDB reporter backend for metrics library
 *
 * (C) 2015 Brandon Hamilton
 * MIT LICENCE
 *
 */

'use strict';

var Report = require('metrics').Report;

var InfluxDBReporter = function(trackedMetrics) {
  var self = this;
  this.report = new Report(trackedMetrics);
}

/**
 * Adds a metric to be tracked by this reporter
 */
InfluxDBReporter.prototype.addMetric = function (){
  this.report.addMetric.apply(this.report, arguments);
}

module.exports = InfluxDBReporter;