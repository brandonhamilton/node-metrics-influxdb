/*
 * File: test/reporter-test.js
 * Description: Test script for the metrics-influxdb reporter module
 */

var metrics = require('metrics'),
    InfluxMetrics = require("../lib/index"),
    expect = require('chai').expect,
    sinon = require('sinon');

describe('reporter', function() {

  var clock;

  before(function () {
    // We need to control time since e.g. Metric's mean depends on it
    // (being Infinity if no time elapsed)
    clock = sinon.useFakeTimers();
  });

  after(function () {
    clock.restore();
  });

  it('should create an empty report without any metrics', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100 });
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    reporter.report(true);
    expect(reporter._influx.points).to.be.empty;
    done();
  });

  it('should create a valid report with a single metric', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100 });
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    reporter.addMetric('test.counter', new metrics.Counter());
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('test.counter count=0i');
    done();
  });

  it('should create a valid report with multiple metrics', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100 });
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    var firstCounter = new InfluxMetrics.Counter();
    var secondCounter = new InfluxMetrics.Counter();
    firstCounter.inc();
    reporter.addMetric('test.one.counter', firstCounter);
    reporter.addMetric('test.two.counter', secondCounter);
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(2);
    expect(reporter._influx.points[0]).to.have.string('test.one.counter count=1i');
    expect(reporter._influx.points[1]).to.have.string('test.two.counter count=0i');
    done();
  });

  it('should add tags', function(done){
    var reporter = new InfluxMetrics.Reporter({
        protocol: 'udp',
        tags: { tag0: "default" },
        tagger: function (key) {
            var dimensions = key.split(".");
            return { dim1: dimensions[0], dim2: dimensions[1] };
        }, 
        bufferSize: 100
    });
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    reporter.addMetric('my.counter', new InfluxMetrics.Counter());
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('my.counter,dim1=my,dim2=counter,tag0=default count=0i');
    done();
  });

  it('should add tags for gauge', function(done){
    var reporter = new InfluxMetrics.Reporter({
        protocol: 'udp',
        tags: { tag0: "default" },
        tagger: function (key) {
          var dimensions = key.split(".");
          return { dim1: dimensions[0], dim2: dimensions[1] };
        },
        bufferSize: 100
    });
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    var gauge = new InfluxMetrics.Gauge();
    reporter.addMetric('my.gauge', gauge);
    gauge.set(4, { tag1: "gaugeTag" })
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('my.gauge,dim1=my,dim2=gauge,tag0=default,tag1=gaugeTag count=4i');
    done();
  });

  it('should set custom name if namer provided', function(done){
    var reporter = new InfluxMetrics.Reporter({
      protocol: 'udp',
      tags: { tag0: "default" },
      tagger: function (key) {
        var dimensions = key.split(".");
        return { dim1: dimensions[0], dim2: dimensions[1] };
      },
      namer: function (key, tags) {
        return "CUSTOM_" + tags.dim2;
      },
      bufferSize: 100
    });
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    reporter.addMetric('my.counter', new InfluxMetrics.Counter());
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('CUSTOM_counter,dim1=my,dim2=counter,tag0=default count=0i');
    done();
  });

  it('should set custom name for a gauge if namer provided', function(done){
    var reporter = new InfluxMetrics.Reporter({
      protocol: 'udp',
      tagger: function (key) {
        var dimensions = key.split(".");
        return { dim1: dimensions[0], dim2: dimensions[1] };
      },
      namer: function (key, tags) {
        return "CUSTOM_" + tags.dim2;
      },
      bufferSize: 100
    });
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    var gauge = new InfluxMetrics.Gauge();
    reporter.addMetric('my.gauge', gauge);
    gauge.set(4, { tag1: "gaugeTag" })
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('CUSTOM_gauge,dim1=my,dim2=gauge,tag1=gaugeTag count=4i');
    done();
  });

  describe("metricReportedHook", function() {

    it('should be called after a metric has been reported', function(done){
      var metricReportedHookCalledFor = false;
      var metricReported = null;
      var reporter = new InfluxMetrics.Reporter({
        protocol: 'udp',
        metricReportedHook: function (key, metric) {
          metricReportedHookCalledFor = key;
          metricReported = metric;
        },
        bufferSize: 100
      });
      expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
      var metric = new InfluxMetrics.Counter();
      reporter.addMetric('my.counter', metric);
      reporter.report(true);
      expect(metricReportedHookCalledFor).to.equal('my.counter');
      expect(metricReported).to.equal(metric);
      done();
    });

    it('should be called after a gauge has been reported', function(done){
      var metricReportedHookCalledFor = false;
      var metricReported = null;
      var reporter = new InfluxMetrics.Reporter({
        protocol: 'udp',
        metricReportedHook: function (key, metric) {
          metricReportedHookCalledFor = key;
          metricReported = metric;
        },
        bufferSize: 100
      });
      expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
      var gauge = new InfluxMetrics.Gauge();
      reporter.addMetric('my.gauge', gauge);
      gauge.set(4)
      reporter.report(true);
      expect(metricReportedHookCalledFor).to.equal('my.gauge');
      expect(metricReported).to.equal(gauge);
      done();
    });

  });

  it('should report on schedule when scheduleInterval is set', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', scheduleInterval: 10, bufferSize: 100});
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    reporter.addMetric('test2.counter', new metrics.Counter());
    expect(reporter._influx.points).to.have.length(0);
    clock.tick(10);
    expect(reporter._influx.points).to.have.length(1);
    clock.tick(10);
    expect(reporter._influx.points).to.have.length(2);
    done();
  });
  
  it('should report on schedule when scheduleInterval start is called and stop when stop is called', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100});
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    reporter.addMetric('test1.counter', new metrics.Counter());
    expect(reporter._influx.points).to.have.length(0);

    expect(reporter._influx.points).to.have.length(0);
    reporter.start(10, true);
    clock.tick(10);

    expect(reporter._influx.points).to.have.length(1);
    clock.tick(10);

    expect(reporter._influx.points).to.have.length(2);
    reporter.stop();
    clock.tick(10);

    expect(reporter._influx.points).to.have.length(2);
    done();
  });

  describe('fieldFilter', function(){

    it('should remove fields via a field name-based fieldFilter', function(done){
      var reporter = new InfluxMetrics.Reporter({
        bufferSize: 100,
        fieldFilter: function(key, metric, fieldName, fieldValue) {
          if (key === "test.histo" && metric.type === "histogram") {
            return ",count,max,mean,median,min,sum,".indexOf("," + fieldName + ",") >= 0;
          }
        }
      });
      var h = new InfluxMetrics.Histogram();
      reporter.addMetric('test.histo', h);
      h.update(100);
      clock.tick(1);

      reporter.report(true);

      expect(reporter._influx.points).to.have.length(1);
      expect(reporter._influx.points[0]).to.have.string('test.histo count=1i,max=100i,mean=100,median=100,min=100i,sum=100i');
      done();
    });

    it('should remove Gauge points via a field value-based fieldFilter', function(done){
      var reporter = new InfluxMetrics.Reporter({
        bufferSize: 100,
        fieldFilter: function(key, metric, fieldName, fieldValue) {
          if (metric.type === "gauge") {
            return fieldValue > 100;
          }
        }
      });
      var g = new InfluxMetrics.Gauge();
      reporter.addMetric('test.gauge', g);
      g.set(100);
      g.set(200);
      clock.tick(1);

      reporter.report(true);

      expect(reporter._influx.points).to.have.length(1);
      expect(reporter._influx.points[0]).to.have.string('test.gauge count=200i ');
      done();
    });

    it('should remove fields via a value-based fieldFilter', function(done){
      var reporter = new InfluxMetrics.Reporter({
        bufferSize: 100,
        fieldFilter: function(key, metric, fieldName, fieldValue) {
          return fieldValue === 1;
        }
      });
      var t = new InfluxMetrics.Timer();
      reporter.addMetric('test.timer', t);
      t.update(100);
      clock.tick(1);

      reporter.report(true);

      expect(reporter._influx.points).to.have.length(1);
      expect(reporter._influx.points[0]).have.string('test.timer count=1i ');
      done();
    });


    it('should not report a point with no fields', function(done){
      var reporter = new InfluxMetrics.Reporter({
        bufferSize: 100,
        fieldFilter: function(key, metric, fieldName, fieldValue) {
          return false;
        }
      });
      var h = new InfluxMetrics.Histogram();
      reporter.addMetric('test.histo', h);
      h.update(100);
      clock.tick(1);

      reporter.report(true);

      expect(reporter._influx.points).to.have.length(0);
      done();
    });

  });

});
