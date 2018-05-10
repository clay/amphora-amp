'use strict';

const _ = require('lodash'),
  fs = require('fs'),
  glob = require('glob'),
  sinon = require('sinon'),
  expect = require('chai').expect,
  amphoraFs = require('amphora-fs'),
  nymagHbs = require('clayhandlebars'),
  filename = __filename.split('/').pop().split('.').shift(),
  render = require('./render'),
  lib = require('./' + filename);

describe(_.startCase(filename), function () {
  let sandbox, fakeLog;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    fakeLog = sandbox.stub();

    sandbox.stub(glob, 'sync');
    sandbox.stub(amphoraFs);
    sandbox.stub(render, 'configure');
    lib.setLog(fakeLog);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('init', function () {
    const fn = lib[this.title];

    it('builds default partials and partials from the components directory', function () {
      sandbox.stub(fs, 'readFileSync');

      sandbox.stub(nymagHbs, 'wrapPartial');
      nymagHbs.wrapPartial.onCall(0).returns('<#if true><div></div></if>');
      nymagHbs.wrapPartial.onCall(1).returns(null);

      amphoraFs.getComponents.returns(['c1', 'c2', 'c3', 'c4']);
      amphoraFs.getComponentPath.withArgs('c1').returns('/components/c1');
      amphoraFs.getComponentPath.withArgs('c2').returns('/components/c2');
      amphoraFs.getComponentPath.withArgs('c3').returns('/components/c3');
      amphoraFs.getComponentPath.withArgs('c4').returns(null);

      glob.sync.withArgs('/components/c1/amp.template.*').returns(['/components/c1/amp.template.handlebars']);
      glob.sync.withArgs('/components/c2/amp.template.*').returns(['/components/c2/amp.template.hbs']);
      glob.sync.withArgs('/components/c3/template.*').returns(['/components/c3/template.nunjucks']);

      fn();

      expect(_.keys(lib.hbs.partials).length).eql(4);
      expect(_.keys(lib.hbs.partials)).contains('component-list');
      expect(_.keys(lib.hbs.partials)).contains('noop-component');
      expect(_.keys(lib.hbs.partials)).contains('c1');
      expect(_.keys(lib.hbs.partials)).contains('c2');
    });
  });

  describe('addHelpers', function () {
    const fn = lib[this.title];

    it('calls the `registerHelper` function for each prop/value', function () {
      sandbox.stub(lib.hbs, 'registerHelper');
      fn({test: _.noop});
      expect(lib.hbs.registerHelper.calledWith('test', _.noop)).to.be.true;
    });
  });

  describe('configureRender', function () {
    const fn = lib[this.title];

    it('calls the render `configure` function', function () {
      fn({ foo: 'bar' });

      sinon.assert.calledOnce(render.configure);
    });

    it('exposes the render options on the module', function () {
      fn({ foo: 'bar' });

      expect(lib.renderSettings).to.eql({ foo: 'bar' });
    });
  });

  describe('addResolveMedia', function () {
    const fn = lib[this.title];

    it('attaches resolveMedia to the module if it is a function', function () {
      fn(_.noop);

      expect(lib.resolveMedia).to.be.a('function');
      lib.resolveMedia = undefined;
    });

    it('does not attach non-function arguments', function () {
      fn(1);

      expect(lib.resolveMedia).to.not.be.a('function');
      lib.resolveMedia = undefined;
    });
  });
});
