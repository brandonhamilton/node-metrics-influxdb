var HTTPClient = require('../lib/http_client'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    https = require('https'),
    http = require('http');

describe('http_client', function () {
    it('should use http protocol by default', function (done) {
        client = new HTTPClient({});
        expect(client.httpModule).to.equal(http);
        done();
    });

    it('should use http protocol', function (done) {
        client = new HTTPClient({protocol: 'http'});
        expect(client.httpModule).to.equal(http);
        done();
    });

    it('should use https protocol', function (done) {
        client = new HTTPClient({protocol: 'https'});
        expect(client.httpModule).to.equal(https);
        done();
    });
});