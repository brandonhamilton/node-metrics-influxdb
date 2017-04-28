/*
*  A simple Gauge object. Added as it is missing in metrics
*/

var Gauge = module.exports = function Gauge() {
  this.points = [];
  this.type = 'gauge';
}

Gauge.prototype.set = function(val) {
  if (val) {
    this.points.push({value: val, timestamp: new Date().getTime()});
  }
}

Gauge.prototype.clear = function() {
  this.points = [];
}

Gauge.prototype.printObj = function() {
  return {type: 'gauge', points: this.points};
}