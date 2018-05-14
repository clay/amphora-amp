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
});
