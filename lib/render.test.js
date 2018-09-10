'use strict';

const _ = require('lodash'),
  expect = require('chai').expect,
  sinon = require('sinon'),
  amphoraFs = require('amphora-fs'),
  filename = __filename.split('/').pop().split('.').shift(),
  mediaService = require('./media'),
  lib = require('./' + filename);

describe(_.startCase(filename), function () {
  let sandbox, fakeLog;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    fakeLog = sandbox.spy();
    sandbox.stub(mediaService);
    sandbox.stub(amphoraFs);
    lib.setLog(fakeLog);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('makeState', function () {
    const fn = lib[this.title];

    it('uses the _layoutRef to generate the _layoutData field', function () {
      const data = {},
        meta = {
          _ref: 'site.com/_pages/bar',
          _layoutRef: 'site.com/_layouts/layout/instances/foo'
        };

      expect(fn(data, meta)).to.eql({
        _components: [],
        _layoutData: {
          name: 'layout',
          uri: 'site.com/_layouts/layout/instances/foo'
        },
        _layoutRef: 'site.com/_layouts/layout/instances/foo',
        _self: 'site.com/_pages/bar'
      });
    });

    it('does not add _layoutData without a _layoutRef in the meta', function () {
      const data = {},
        meta = {
          _ref: 'site.com/_components/example/foo',
          _layoutRef: undefined
        };

      expect(fn(data, meta)).to.eql({
        _components: [],
        _layoutRef: undefined,
        _self: 'site.com/_components/example/foo'
      });
    });
  });

  describe('render', function () {
    var hbs = {
      partials: {
        layout: _.noop,
        foo: _.noop
      }
    };

    function mockRes(box) {
      return {
        type: box.spy(),
        send: box.spy(),
        status: box.spy()
      };
    }

    function mockData() {
      return {
        _ref: 'site.com/_components/foo/instances/foo',
        bar: true
      };
    }

    function mockPageMeta() {
      return {
        _layoutRef: 'site.com/_layouts/layout/instances/foo',
        _ref: 'site.com/_pages/index',
        locals: {
          host: 'host.com'
        }
      };
    }

    function mockCmptMeta() {
      return {
        _ref: 'site.com/_components/foo/instances/foo',
        locals: {
          host: 'host.com'
        }
      };
    }

    it('renders a page with a layout', function () {
      const data = mockData(),
        meta = mockPageMeta(),
        res = mockRes(sandbox),
        tpl = '<html></html>';

      sandbox.stub(hbs.partials, 'layout').returns(tpl);
      lib.setHbs(hbs);

      return lib(data, meta, res).then(() => {
        sinon.assert.calledWith(res.send, tpl);
      });
    });

    it('renders a page which has components', function () {
      const data = mockData(),
        meta = mockPageMeta(),
        res = mockRes(sandbox),
        tpl = '<html></html>';

      amphoraFs.getIndices.returns({ components: ['foo'] });
      sandbox.stub(hbs.partials, 'layout').returns(tpl);
      lib.setHbs(hbs);

      return lib(data, meta, res).then(() => {
        sinon.assert.calledWith(res.send, tpl);
      });
    });

    it('renders a component individually', function () {
      var data = mockData(),
        res = mockRes(sandbox),
        meta = mockCmptMeta(),
        tpl = '<div></div>';

      sandbox.stub(hbs.partials, 'foo').returns(tpl);
      lib.setHbs(hbs);
      return lib(data, meta, res)
        .then(() => {
          sinon.assert.calledWith(res.send, tpl);
        });
    });

    it('rejects if the root partial is not available', function () {
      const data = mockData(),
        res = mockRes(sandbox),
        meta = mockCmptMeta();

      meta._ref = 'site.com/_components/bar/instances/bar';
      lib.setHbs(hbs);

      return lib(data, meta, res)
        .then(() => {
          sinon.assert.calledWith(res.status, 500);
          sinon.assert.calledWith(fakeLog, 'error');
        });
    });
  });

  describe('configure', function () {
    const fn = lib[this.title];

    it('calls the mediaService configure function', function () {
      fn({ editAssetTags: true });
      sinon.assert.calledOnce(mediaService.configure);
    });
  });
});
