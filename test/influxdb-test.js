/*
 * File: test/influxdb-test.js
 * Description: Test script for the metrics-influxdb influx module
 */

var InfluxMetrics = require("../lib/index"),
    expect = require('chai').expect;

describe('influxdb', function() {

  it('should correctly serialize a counter', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100 });
    expect(reporter).to.be.defined;
    var c = new InfluxMetrics.Counter();
    reporter.addMetric('test.counter', c);
    c.inc();
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('test.counter count=1i');
    done();
  });

  it('should correctly serialize a gauge', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100 });
    expect(reporter).to.be.defined;
    var g = new InfluxMetrics.Gauge();
    reporter.addMetric('test.gauge', g);
    g.set(10);
    g.set(15);
    expect(g.points).to.have.length(2);
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(2);
    expect(reporter._influx.points[0]).to.have.string('test.gauge count=10i');
    expect(reporter._influx.points[1]).to.have.string('test.gauge count=15i');

    g.set(12);
    reporter.report(true);
    expect(reporter._influx.points[0]).to.have.string('test.gauge count=10i');
    expect(reporter._influx.points[1]).to.have.string('test.gauge count=15i');
    expect(reporter._influx.points[2]).to.have.string('test.gauge count=12i');
    expect(reporter._influx.points).to.have.length(3);
    
    reporter.report(true);
    done();

  });

  it('should correctly serialize a meter', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100 });
    expect(reporter).to.be.defined;
    var m = new InfluxMetrics.Meter();
    reporter.addMetric('test.meter', m);
    m.mark();
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('test.meter count=1i');
    expect(reporter._influx.points[0]).to.have.string('fifteen-minute=');
    expect(reporter._influx.points[0]).to.have.string('five-minute=');
    expect(reporter._influx.points[0]).to.have.string('one-minute=');
    expect(reporter._influx.points[0]).to.have.string('mean-rate=');
    done();
  });

  it('should correctly serialize a histogram', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100 });
    expect(reporter).to.be.defined;
    var h = new InfluxMetrics.Histogram();
    reporter.addMetric('test.histogram', h);
    h.update(50);
    h.update(100);
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('test.histogram ');
    expect(reporter._influx.points[0]).to.have.string('count=');
    expect(reporter._influx.points[0]).to.have.string('min=');
    expect(reporter._influx.points[0]).to.have.string('max=');
    expect(reporter._influx.points[0]).to.have.string('sum=');
    expect(reporter._influx.points[0]).to.have.string('mean=');
    expect(reporter._influx.points[0]).to.have.string('variance=');
    expect(reporter._influx.points[0]).to.have.string('std-dev=');
    expect(reporter._influx.points[0]).to.have.string('median=');
    expect(reporter._influx.points[0]).to.have.string('75-percentile=');
    expect(reporter._influx.points[0]).to.have.string('95-percentile=');
    expect(reporter._influx.points[0]).to.have.string('99-percentile=');
    expect(reporter._influx.points[0]).to.have.string('999-percentile=');
    done();
  });

  it('should correctly serialize a timer', function(done){
    var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', bufferSize: 100 });
    expect(reporter).to.be.defined;
    var t = new InfluxMetrics.Timer();
    reporter.addMetric('test.timer', t);
    t.update(50);
    t.update(100);
    reporter.report(true);
    expect(reporter._influx.points).to.have.length(1);
    expect(reporter._influx.points[0]).to.have.string('test.timer ');
    expect(reporter._influx.points[0]).to.have.string('count=');
    expect(reporter._influx.points[0]).to.have.string('fifteen-minute=');
    expect(reporter._influx.points[0]).to.have.string('five-minute=');
    expect(reporter._influx.points[0]).to.have.string('one-minute=');
    expect(reporter._influx.points[0]).to.have.string('mean-rate=');
    expect(reporter._influx.points[0]).to.have.string('min=');
    expect(reporter._influx.points[0]).to.have.string('max=');
    expect(reporter._influx.points[0]).to.have.string('sum=');
    expect(reporter._influx.points[0]).to.have.string('mean=');
    expect(reporter._influx.points[0]).to.have.string('variance=');
    expect(reporter._influx.points[0]).to.have.string('std-dev=');
    expect(reporter._influx.points[0]).to.have.string('median=');
    expect(reporter._influx.points[0]).to.have.string('75-percentile=');
    expect(reporter._influx.points[0]).to.have.string('95-percentile=');
    expect(reporter._influx.points[0]).to.have.string('99-percentile=');
    expect(reporter._influx.points[0]).to.have.string('999-percentile=');
    done();
  });

});