/*
*  A simple Gauge object. Added as it is missing in metrics
*/

var Gauge = module.exports = function Gauge() {
  this.points = [];
  this.type = 'gauge';
}

Gauge.prototype.set = function(val) {
  if (val) {
    this.points.push({value: val, timestamp: new Date().getTime(), tags:{}});
  }
}

Gauge.prototype.set = function(val, tags) {
  if (val) {
    this.points.push({value: val, timestamp: new Date().getTime(), tags: tags});
  }
}

Gauge.prototype.clear = function() {
  this.points = [];
}

Gauge.prototype.printObj = function() {
  return {type: 'gauge', points: this.points};
}