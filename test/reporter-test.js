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
    expect(reporter).to.be.defined;
    reporter.report(true);
    expect(reporter._influx.points).to.be.empty;
    done();
  });

  it('should create a valid report with a single metric', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100 });
    expect(reporter).to.be.defined;
    reporter.addMetric('test.counter', new metrics.Counter());
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('test.counter count=0i');
    done();
  });

  it('should create a valid report with multiple metrics', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100 });
    expect(reporter).to.be.defined;
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
    expect(reporter).to.be.defined;
    reporter.addMetric('my.counter', new InfluxMetrics.Counter());
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('my.counter,dim1=my,dim2=counter,tag0=default count=0i');
    done();
  });

  it('should report on schedule when scheduleInterval is set', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', scheduleInterval: '10', bufferSize: 100});
    expect(reporter).to.be.defined;
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
    expect(reporter).to.be.defined;
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
