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

/* Object.assign polyfill for node <= 0.12
 * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 */
var objectAssign = (typeof Object.assign != 'function') ? function (target) {
  if (target === undefined || target === null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  var output = Object(target);
  for (var index = 1; index < arguments.length; index++) {
    var source = arguments[index];
    if (source !== undefined && source !== null) {
      for (var nextKey in source) {
        if (Object.prototype.hasOwnProperty.call(source, nextKey)) {
          output[nextKey] = source[nextKey];
        }
      }
    }
  }
  return output;
} : Object.assign;

var Reporter = function(options) {
  options = options || {}
  this._influx = new Influx(options);
  this._report = new Report(options.trackedMetrics);
  this.tags = options.tags || {};
  this.skipIdleMetrics = options.skipIdleMetrics || false;
  this.bufferSize = options.bufferSize || 0;
  this.previousValues = {};
  this.tagger = options.tagger || function () { return {}; };
  this.namer = options.namer || function (metricKey) { return metricKey; };
  this.metricReportedHook = options.metricReportedHook || function (key, metric) {};

  if (options.scheduleInterval) {
    this.start(options.scheduleInterval, true);
  }
}

/**
 * Starts the calling {@link Reporter.report} on a scheduled interval.
 * @param {Number} interval Number How often to report in milliseconds.
 */
Reporter.prototype.start = function(scheduleInterval, useBuffer) {
  this.scheduleInterval = scheduleInterval;
  this.scheduledReport = setInterval(this.report.bind(this, useBuffer), scheduleInterval);
};

/**
 * Stops the reporter if it was previously started.
 */
Reporter.prototype.stop = function() {
  this.scheduleInterval = null;
  if('scheduledReport' in this) {
    clearInterval(this.scheduledReport);
  }
};

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

Reporter.prototype.report = function(useBuffer) {
  var summary = this._report.summary();
  var timestamp = new Date().getTime();

  for (var namespace in summary) {
    for (var metric in summary[namespace]) {
      var key = namespace + '.' + metric;
      var fields = {};
      switch(summary[namespace][metric].type) {
        case 'counter':
          if (canSkipMetric(this, key, summary[namespace][metric].count)) {
            continue;
          }
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
        case 'gauge':
          var gaugeArray = summary[namespace][metric].points.splice(0, summary[namespace][metric].points.length);
          gaugeArray.forEach(function(gauge) {
            var gaugeFields = {};
            gaugeFields['count']   = { type: 'integer', value: gauge.value };
            var tags = objectAssign(this.tagger(key), this.tags, gauge.tags);
            this._influx.addPoint(key, tags, gauge.timestamp, gaugeFields);
          }, this);
          continue;
        default:
          continue;
      }
      var tags = objectAssign(this.tagger(key), this.tags);
      this._influx.addPoint(key, tags, timestamp, fields);
    }
    if ((this._influx.points.length > this.bufferSize && useBuffer) || !useBuffer) {
        this._influx.write();
    }
}

Reporter.prototype.addPoint = function (key, timestamp, fields, extraTags) {

    // Skip invalid fields; e.g. a Timer's std-dev and variance are sometimes NaN
    for (var fieldName in fields) {
        if (fields.hasOwnProperty(fieldName)) {
            var value = fields[fieldName].value;
            if (isNaN(value) || !isFinite(value)) {
                delete fields[fieldName];
            }
        }
    }

    var tags = objectAssign(this.tagger(key), this.tags, extraTags || {});
    var metricName = this.namer(key, tags);
    this._influx.addPoint(metricName, tags, timestamp, fields);

    // Post-report hook so that the metric can be reset if needed etc.
    this.metricReportedHook(key, this._report.getMetric(key));
}

Reporter.prototype.addMetric = function (){
  this._report.addMetric.apply(this._report, arguments);
}

Reporter.prototype.getMetric = function (name){
  return this._report.getMetric(name);
}

module.exports = Reporter;
