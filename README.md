# InfluxDB reporter for metrics

This is a TEST

[![Build Status](https://travis-ci.org/brandonhamilton/node-metrics-influxdb.svg)](https://travis-ci.org/brandonhamilton/node-metrics-influxdb)
[![Dependency Status](https://david-dm.org/brandonhamilton/node-metrics-influxdb.svg)](https://david-dm.org/brandonhamilton/node-metrics-influxdb)
[![devDependency Status](https://david-dm.org/brandonhamilton/node-metrics-influxdb/dev-status.svg)](https://david-dm.org/brandonhamilton/node-metrics-influxdb#info=devDependencies)

A node.js InfluxDB v0.9 reporting backend for [metrics](https://www.npmjs.com/package/metrics)

# Installation

    $ npm install metrics-influxdb

## Usage

```javascript
"use strict";

var InfluxMetrics = require('metrics-influxdb');

var reporter = new InfluxMetrics.Reporter({ protocol: 'udp', tags: { 'server': 'one' } });
var c = new InfluxMetrics.Counter();
reporter.addMetric('test.counter', c);
c.inc();

var g = new InfluxMetrics.Gauge();
reporter.addMetric('test.gauge', g);
g.set(10);

var h = new InfluxMetrics.Histogram();
reporter.addMetric('test.histogram', h);
h.update(50);

var m = new InfluxMetrics.Meter();
reporter.addMetric('test.meter', m);
m.mark(1);

var t = new InfluxMetrics.Timer();
reporter.addMetric('test.timer', t);
t.update(50);

reporter.report(); // Send metrics to InfluxDB
reporter.report(false); // Force flush of all metrics in buffer

reporter.start(1000) // Schedule report to be run every 1000 ms (also available through options)
reporter.stop() // Stop scheduled reporter 
```

## Configuration

The ``options`` object accepts the following fields:

<table>
  <tr>
    <th>Parameter</th><th>Type</th><th>Default</th><th>Description</th>
  </tr>
  <tr>
    <th>host</th>
    <td>string</td>
    <td><code>127.0.0.1</code></td>
    <td>InfluxDB host</td>
  </tr>
  <tr>
    <th>port</th>
    <td>number</td>
    <td><code>8089</code>(<code>udp</code>) / <code>8086</code>(<code>http</code>)</td>
    <td>InfluxDB port</td>
  </tr>
  <tr>
    <th>protocol</th>
    <td>string</td>
    <td><code>udp</code></td>
    <td>InfluxDB protocol (<code>udp</code> / <code>http</code>)</td>
  </tr>
  <tr>
    <th>tags</th>
    <td>object</td>
    <td><code>{}</code></td>
    <td>Tags to add to influxdb measurements</td>
  </tr>
  <tr>
    <th>tagger</th>
    <td>function</td>
    <td><code>none</code></td>
    <td>Function invoked with the metric key and expected to return the tags for
    it in the form <code>{tag1: value1, tag2: value2, ...}</code>
        </td>
  </tr>
  <tr>
    <th>precision</th>
    <td>string</td>
    <td><code>n</code></td>
    <td><code>n</code>/<code>u</code>/<code>ms</code>/<code>s</code>/<code>m</code>/<code>h</code></td>
  </tr>
  <tr>
    <th>bufferSize</th>
    <td>number</td>
    <td><code>0</code></td>
    <td>Number of points to keep before sending to InfluxDB</td>
  </tr>
  <tr>
    <th>scheduleInterval</th>
    <td>number</td>
    <td><code>null</code></td>
    <td>This is the time in ms to flush any buffered metrics</td>
  </tr>
  <tr>
    <th>skipIdleMetrics</th>
    <td>boolean</td>
    <td><code>false</code></td>
    <td>Suppress sending of metrics if there has been no new updates from previous report</td>
  </tr>
</table>

The <code>udp</code> protocol accepts the following additional options:
<table>
  <tr>
    <th>Parameter</th><th>Type</th><th>Default</th><th>Description</th>
  </tr>
  <tr>
    <th>maxPacketSize</th>
    <td>integer</td>
    <td><code>1024</code></td>
    <td>Maximum safe UDP packet size to use</td>
  </tr>
</table>

The <code>http</code> protocol accepts the following additional options:
<table>
  <tr>
    <th>Parameter</th><th>Type</th><th>Default</th><th>Description</th>
  </tr>
  <tr>
    <th>username</th>
    <td>string</td>
    <td><code>null</code></td>
    <td>InfluxDB username</td>
  </tr>
  <tr>
    <th>password</th>
    <td>string</td>
    <td><code>null</code></td>
    <td>InfluxDB password</td>
  </tr>
  <tr>
    <th>database</th>
    <td>string</td>
    <td><code>null</code></td>
    <td>InfluxDB database</td>
  </tr>
  <tr>
    <th>consistency</th>
    <td>string</td>
    <td><code>null</code></td>
    <td><code>one</code>/<code>quorum</code>/<code>all</code>/<code>any</code></td>
  </tr>
  <tr>
    <th>httpTimeout</th>    
    <td>number</td>
    <td><code>200</code></td>
    <td>http Timeout ms</td>
  </tr>
</table>

</table>

## Todo

- [ ] Expose errors in http/udp transport

## Credits

This module is based on [metrics-influxdb](https://github.com/dropwizard/metrics) by dropwizard.

## License

The MIT License (MIT)

Copyright (c) 2015 Brandon Hamilton

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
