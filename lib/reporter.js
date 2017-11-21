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
  options = options || {};
  // Default precision to ms because that is what we are sending
  options.precision = options.precision || 'ms';
  this._influx = new Influx(options);
  this._report = new Report(options.trackedMetrics);
  this.tags = options.tags || {};
  this.skipIdleMetrics = options.skipIdleMetrics || false;
  this.bufferSize = options.bufferSize || 0;
  this.previousValues = {};
  this.tagger = options.tagger || function () { return {}; };
  this.namer = options.namer || function (metricKey) { return metricKey; };
  this.metricReportedHook = options.metricReportedHook || function (key, metric) {};
  this.fieldFilter = options.fieldFilter || function (key, metric, fieldName, fieldValue) { return true; };

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

Reporter.prototype._addField = function (key, metric, fields, fieldName, field) {
  if (this.fieldFilter(key, metric, fieldName, field.value)) {
    fields[fieldName] = field;
  }
  return fields;
}

Reporter.prototype.report = function(useBuffer) {
    var summary = this._report.summary();
    var timestamp = new Date().getTime();

    for (var namespace in summary) {
        for (var metricName in summary[namespace]) {
            var key = namespace + '.' + metricName;
            var fields = {};
          var metric = summary[namespace][metricName];

          switch(metric.type) {
                case 'counter':
                    if (canSkipMetric(this, key, metric.count)) {
                        continue;
                    }
                    this._addField(key, metric, fields, "count", {type: 'integer', value: metric.count});
                    break;
                case 'meter':
                    if (canSkipMetric(this, key, metric.count)) {
                        continue;
                    }
                    this._addField(key, metric, fields, "count", {type: 'integer', value: metric.count});
                    this._addField(key, metric, fields, "m1_rate", {type: 'float', value: metric.m1});
                    this._addField(key, metric, fields, "m5_rate", {type: 'float', value: metric.m5});
                    this._addField(key, metric, fields, "m15_rate", {type: 'float', value: metric.m15});
                    this._addField(key, metric, fields, "mean-rate", {type: 'float', value: metric.mean});
                    break;
                case 'histogram':
                    if (canSkipMetric(this, key, metric.count)) {
                        continue;
                    }
                    this._addField(key, metric, fields, "count", {type: 'integer', value: metric.count});
                    this._addField(key, metric, fields, "min", {type: 'integer', value: metric.min});
                    this._addField(key, metric, fields, "max", {type: 'integer', value: metric.max});
                    this._addField(key, metric, fields, "sum", {type: 'integer', value: metric.sum});
                    this._addField(key, metric, fields, "mean", {type: 'float', value: metric.mean});
                    this._addField(key, metric, fields, "variance", {type: 'float', value: metric.variance});
                    this._addField(key, metric, fields, "std-dev", {type: 'float', value: metric.std_dev});
                    this._addField(key, metric, fields, "median", {type: 'float', value: metric.median});
                    this._addField(key, metric, fields, "p75", {type: 'float', value: metric.p75});
                    this._addField(key, metric, fields, "p95", {type: 'float', value: metric.p95});
                    this._addField(key, metric, fields, "p99", {type: 'float', value: metric.p99});
                    this._addField(key, metric, fields, "p999", {type: 'float', value: metric.p999});
                    break;
                case 'timer':
                    if (canSkipMetric(this, key, metric.duration.count)) {
                        continue;
                    }
                    this._addField(key, metric, fields, "count", {type: 'integer', value: metric.duration.count});
                    this._addField(key, metric, fields, "m1_rate", {type: 'float', value: metric.rate.m1});
                    this._addField(key, metric, fields, "m5_rate", {type: 'float', value: metric.rate.m5});
                    this._addField(key, metric, fields, "m15_rate", {type: 'float', value: metric.rate.m15});
                    this._addField(key, metric, fields, "mean-rate", {type: 'float', value: metric.rate.mean});
                    this._addField(key, metric, fields, "min", {type: 'integer', value: metric.duration.min});
                    this._addField(key, metric, fields, "max", {type: 'integer', value: metric.duration.max});
                    this._addField(key, metric, fields, "sum", {type: 'integer', value: metric.duration.sum});
                    this._addField(key, metric, fields, "mean", {type: 'float', value: metric.duration.mean});
                    this._addField(key, metric, fields, "variance", {type: 'float', value: metric.duration.variance});
                    this._addField(key, metric, fields, "std-dev", {type: 'float', value: metric.duration.std_dev});
                    this._addField(key, metric, fields, "median", {type: 'float', value: metric.duration.median});
                    this._addField(key, metric, fields, "p75", {type: 'float', value: metric.duration.p75});
                    this._addField(key, metric, fields, "p95", {type: 'float', value: metric.duration.p95});
                    this._addField(key, metric, fields, "p99", {type: 'float', value: metric.duration.p99});
                    this._addField(key, metric, fields, "p999", {type: 'float', value: metric.duration.p999});
                    break;
                case 'gauge':
                    var gaugeArray = metric.points.splice(0, metric.points.length);
                    gaugeArray.forEach(function(gauge) {
                        var gaugeFields = this._addField(key, metric, {}, "count", {type: 'integer', value: gauge.value});
                        this.addPoint(key, gauge.timestamp, gaugeFields, gauge.tags);
                    }, this);
                    continue;
                default:
                    continue;
            }

            this.addPoint(key, timestamp, fields);
        }
    }
    if ((this._influx.points.length > this.bufferSize && useBuffer) || !useBuffer) {
        this._influx.write();
    }
}

Reporter.prototype.addPoint = function (key, timestamp, fields, extraTags) {

  if (isEmpty(fields)) return;

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

function isEmpty(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }

  return true;
}

module.exports = Reporter;