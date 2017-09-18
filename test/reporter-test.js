/*
 * File: test/reporter-test.js
 * Description: Test script for the metrics-influxdb reporter module
 */

var metrics = require('metrics'),
    InfluxMetrics = require("../lib/index"),
    expect = require('chai').expect;

describe('reporter', function() {

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
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', scheduleInterval: '10', bufferSize: 100});
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    reporter.addMetric('test2.counter', new metrics.Counter());
    expect(reporter._influx.points).to.have.length(0);
    setTimeout(function() {
      expect(reporter._influx.points).to.have.length(1);
      setTimeout(function() {
        expect(reporter._influx.points).to.have.length(2);
        done();
      }, 10);
    }, 10);
  });
  
  it('should report on schedule when scheduleInterval start is called and stop when stop is called', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100});
    expect(reporter).to.be.an.instanceof(InfluxMetrics.Reporter);
    reporter.addMetric('test1.counter', new metrics.Counter());
    expect(reporter._influx.points).to.have.length(0);
    setTimeout(function() {
      expect(reporter._influx.points).to.have.length(0);
      reporter.start(10, true);
      setTimeout(function() {
        expect(reporter._influx.points).to.have.length(1);
        setTimeout(function() {
          expect(reporter._influx.points).to.have.length(2);
          reporter.stop();
          setTimeout(function() {
            expect(reporter._influx.points).to.have.length(2);
            done();
          }, 10);
        }, 10);
      }, 10);
    }, 10);
  });

});
