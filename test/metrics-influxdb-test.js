/*
 * File: test/metrics-influxdb-test.js
 * Description: Test script for the metrics-influxdb library
 */

var metrics = require('metrics'),
    influxdbReporter = require("../lib/influxdbreporter"),
    expect = require('chai').expect;

describe('metrics-influxdb', function() {

  it('should create a report', function(done){
    var report = new influxdbReporter();
    expect(report).to.be.defined;
    expect(report).to.respondTo('addMetric');
    done();
  });

});