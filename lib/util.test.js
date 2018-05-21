'use strict';

const _ = require('lodash'),
  sinon = require('sinon'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename);

describe(_.startCase(filename), function () {
  let sandbox, fakeLog;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    fakeLog = sandbox.stub();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('safeGetComponentName', function () {
    const fn = lib[this.title];

    it('returns the noop component when a component name cannot be extracted from the ref', function () {
      const helper = fn({partials: {}}, fakeLog);

      expect(helper('foo')).eql('noop-component');
      sinon.assert.notCalled(fakeLog);
    });

    it('returns the noop component when there is no partial for the component name in the ref', function () {
      const helper = fn({partials: {}}, fakeLog);

      expect(helper('_components/foo')).eql('noop-component');
      sinon.assert.calledOnce(fakeLog);
    });

    it('returns the component name if there is a corresponding partial', function () {
      const helper = fn({partials: {foo: 'foo'}}, fakeLog);

      expect(helper('_components/foo')).eql('foo');
    });
  });

  describe('getByteLength', function () {
    const fn = lib[this.title];

    it('returns byte length of an empty string', function () {
      expect(fn('')).eql(0);
    });

    it('returns byte length of a string with content', function () {
      expect(fn('abc_123')).eql(7);
    });
  });

  describe('memoize', function () {
    let memLeak, clock;
    const fn = lib[this.title];

    beforeEach(function () {
      memLeak = lib.getMemoryLeakThreshold();
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      lib.setMemoryLeakThreshold(memLeak);
      clock.restore();
    });

    it('memoizes the input function based on the first parameter specified in the memoization', function () {
      const resultFn = fn(function () { return 'd'; }, fakeLog);

      resultFn('a', 'b', 'c');

      expect(_.get(resultFn, 'cache.__data__.string.__data__')).to.deep.equal({a: 'd'});
    });

    it('memoizes with a set method', function () {
      const resultFn = fn(function () { return 'd'; }, fakeLog);

      resultFn('a', 'b', 'c');
      resultFn.cache = {};

      expect(_.get(resultFn, 'cache.__data__.string.__data__')).to.be.undefined;
    });

    it('warns when over the memoization limit', function () {
      const resultFn = fn(function namedFn() { return 'd'; }, fakeLog);

      lib.setMemoryLeakThreshold(0);

      resultFn('a');
      resultFn('b');
      resultFn('c');

      expect(fakeLog.calledOnce).eql(true);

      clock.tick(60000);
    });
  });

  describe('defineWritable', function () {
    const fn = lib[this.title];

    it('sets writable when get and set are not supplied', function () {
      expect(fn({}).writable).eql(true);
    });

    it('overrides writable if get and set are not supplied', function () {
      expect(fn({writable: false}).writable).eql(true);
    });

    it('does not set writable when get or set are supplied', function () {
      expect(fn({get: '1'}).writable).to.be.undefined;
    });

    it('does not override writable if get or set is supplied', function () {
      expect(fn({writable: false, get: '1'}).writable).eql(false);
    });
  });
});
