var Metrics = require('metrics')

exports.Gauge = require('./gauge');
exports.Histogram = Metrics.Histogram;
exports.Meter = Metrics.Meter;
exports.Counter = Metrics.Counter;
exports.Timer = Metrics.Timer;

exports.Reporter = require('./reporter');