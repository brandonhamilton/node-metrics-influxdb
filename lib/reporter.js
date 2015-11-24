/*
 * reporter.js: Reporter backend for metrics library
 *
 * (C) 2015 Brandon Hamilton
 * MIT LICENCE
 *
 */

'use strict';

var Influx = require('./influxdb'),
    Report = require('metrics').Report;

var Reporter = function(options) {
  options = options || {}
  this._influx = new Influx(options);
  this._report = new Report(options.trackedMetrics);
  this.tags = options.tags || {};
  this.skipIdleMetrics = options.skipIdleMetrics || false;
  this.previousValues = {};
}

function delta(reporter, name, value) {
  var previous = reporter.previousValues[name];
  if (typeof previous == 'undefined') {
    return -1;
  }
  return value - previous;
}

function canSkipMetric(reporter, name, value) {
  var isIdle = delta(reporter, name, value) == 0;
  if (reporter.skipIdleMetrics && !isIdle) {
    reporter.previousValues[name] = value;
  }
  return reporter.skipIdleMetrics && isIdle;
}

Reporter.prototype.report = function(buffer) {
  var summary = this._report.summary();
  var timestamp = new Date().getTime();

  for (var namespace in summary) {
    for (var metric in summary[namespace]) {
      var key = namespace + '.' + metric;
      var fields = {};
      switch(summary[namespace][metric].type) {
        case 'counter':
          fields['count']          = { type: 'integer', value: summary[namespace][metric].count };
          break;
        case 'meter':
          if (canSkipMetric(this, key, summary[namespace][metric].count)) {
            continue;
          }
          fields['count']          = { type: 'integer', value: summary[namespace][metric].count };
          fields['one-minute']     = { type: 'float', value: summary[namespace][metric].m1 };
          fields['five-minute']    = { type: 'float', value: summary[namespace][metric].m5 };
          fields['fifteen-minute'] = { type: 'float', value: summary[namespace][metric].m15 };
          fields['mean-rate']      = { type: 'float', value: summary[namespace][metric].mean };
          break;
        case 'histogram':
          if (canSkipMetric(this, key, summary[namespace][metric].count)) {
            continue;
          }
          fields['count']          = { type: 'integer', value: summary[namespace][metric].count };
          fields['min']            = { type: 'integer', value: summary[namespace][metric].min };
          fields['max']            = { type: 'integer', value: summary[namespace][metric].max };
          fields['sum']            = { type: 'integer', value: summary[namespace][metric].sum };
          fields['mean']           = { type: 'float', value: summary[namespace][metric].mean };
          fields['variance']       = { type: 'float', value: summary[namespace][metric].variance };
          fields['std-dev']        = { type: 'float', value: summary[namespace][metric].std_dev };
          fields['median']         = { type: 'float', value: summary[namespace][metric].median };
          fields['75-percentile']  = { type: 'float', value: summary[namespace][metric].p75 };
          fields['95-percentile']  = { type: 'float', value: summary[namespace][metric].p95 };
          fields['99-percentile']  = { type: 'float', value: summary[namespace][metric].p99 };
          fields['999-percentile'] = { type: 'float', value: summary[namespace][metric].p999 };
          break;
        case 'timer':
          if (canSkipMetric(this, key, summary[namespace][metric].rate.count)) {
            continue;
          }
          fields['count']          = { type: 'integer', value: summary[namespace][metric].rate.count };
          fields['one-minute']     = { type: 'float', value: summary[namespace][metric].rate.m1 };
          fields['five-minute']    = { type: 'float', value: summary[namespace][metric].rate.m5 };
          fields['fifteen-minute'] = { type: 'float', value: summary[namespace][metric].rate.m15 };
          fields['mean-rate']      = { type: 'float', value: summary[namespace][metric].rate.mean };
          fields['min']            = { type: 'integer', value: summary[namespace][metric].duration.min };
          fields['max']            = { type: 'integer', value: summary[namespace][metric].duration.max };
          fields['sum']            = { type: 'integer', value: summary[namespace][metric].duration.sum };
          fields['mean']           = { type: 'float', value: summary[namespace][metric].duration.mean };
          fields['variance']       = { type: 'float', value: summary[namespace][metric].duration.variance };
          fields['std-dev']        = { type: 'float', value: summary[namespace][metric].duration.std_dev };
          fields['median']         = { type: 'float', value: summary[namespace][metric].duration.median };
          fields['75-percentile']  = { type: 'float', value: summary[namespace][metric].duration.p75 };
          fields['95-percentile']  = { type: 'float', value: summary[namespace][metric].duration.p95 };
          fields['99-percentile']  = { type: 'float', value: summary[namespace][metric].duration.p99 };
          fields['999-percentile'] = { type: 'float', value: summary[namespace][metric].duration.p999 };
          break;
        default:
          continue;
      }
      this._influx.addPoint(key, this.tags, timestamp, fields);
    }
  }
  if (!buffer) {
    this._influx.write();
  }
}

Reporter.prototype.addMetric = function (){
  this._report.addMetric.apply(this._report, arguments);
}

module.exports = Reporter;
