'use strict';

var chai = require('chai');

var expect = chai.expect;

var MultiParser = require('../../multiparser.js');

describe('MultiParser', function () {
  var parser, output, parts, path, current;
  function line(text) {
    parser.write(new Buffer(text + '\r\n'));
    return line;
  };
  beforeEach(function () {
    var boundary = 'boundary';
    parser = new MultiParser(boundary);
    path = [parser];
    var onPart = function (part) {
      current = part;
      current.body = '';
      current.on('data', function (data) {
        this.body += data.toString();
      });
      current.on('part', function (part) {
        onPart(part);
      });
    };
    onPart(parser.current);
  });
  it('should allow a boundary to skip the newline when the body is empty', function () {
    line('--boundary--');
    expect( function () { parser.end(); }).not.to.throw();
    expect(parser.current.parts.length).to.equal(0);
  });
  it('should accept a multipart/form-data message', function () {
    line('');
    line('--boundary');
    line('Content-Disposition: form-data; name="text"');
    line('');
    line('text default');
    line('--boundary');
    line('Content-Disposition: form-data; name="file1"; filename="a.txt"');
    line('Content-Type: text/plain');
    line('');
    line('Content of a.txt.');
    line('');
    line('--boundary');
    line('Content-Disposition: form-data; name="file2"; filename="a.html"');
    line('Content-Type: text/html');
    line('');
    line('<!DOCTYPE html><title>Content of a.html.</title>');
    line('');
    line('--boundary--');

    parser.current.on('end', function () {
      expect(parser.current.parts.length).to.equal(3);
      expect(Object.keys(parser.current.parts[0].headers).length).to.equal(1);
      expect(parser.current.parts[0].headers['content-disposition']).to.equal('form-data; name="text"');
      expect(parser.current.parts[0].body).to.equal('text default');
      expect(Object.keys(parser.current.parts[1].headers).length).to.equal(2);
      expect(parser.current.parts[1].headers['content-disposition']).to.equal('form-data; name="file1"; filename="a.txt"');
      expect(parser.current.parts[1].headers['content-type']).to.equal('text/plain');
      expect(parser.current.parts[1].body).to.equal('Content of a.txt.\r\n');
      expect(Object.keys(parser.current.parts[2].headers).length).to.equal(2);
      expect(parser.current.parts[2].headers['content-disposition']).to.equal('form-data; name="file2"; filename="a.html"');
      expect(parser.current.parts[2].headers['content-type']).to.equal('text/html');
      expect(parser.current.parts[2].body).to.equal('<!DOCTYPE html><title>Content of a.html.</title>\r\n');
    });

    expect( function () { parser.end(); }).not.to.throw();
  });
});
