'use strict';

const _ = require('lodash'),
  sinon = require('sinon'),
  filename = __filename.split('/').pop().split('.').shift(),
  mediaService = require('./media'),
  lib = require('./' + filename);

describe(_.startCase(filename), () => {
  let sandbox, fakeLog;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    fakeLog = jest.fn();
    // sandbox.stub(mediaService);
    // sandbox.stub(amphoraFs);
    lib.setLog(fakeLog);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('render', () => {
    var hbs = {
      partials: {
        layout: _.noop,
        foo: _.noop
      }
    };

    function mockRes() {
      return {
        type: () => false,
        send: () => false,
        status: () => false
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

    test('renders a page with a layout', () => {
      const data = mockData(),
        meta = mockPageMeta(),
        res = mockRes();

      jest.spyOn(res, 'send');
      jest.spyOn(mediaService, 'injectStyles').mockReturnValue('<html></html>');
      jest.spyOn(hbs.partials, 'layout').mockReturnValue('<html></html>');
      lib.setHbs(hbs);

      return lib(data, meta, res)
        .then(() => {
          expect(res.send.mock.calls[0][0]).toEqual('<html></html>');
        });
    });

    test('renders a component individually', () => {
      const data = mockData(),
        res = mockRes(),
        meta = mockCmptMeta(),
        tpl = '<div></div>';

      jest.spyOn(res, 'send');
      jest.spyOn(mediaService, 'injectStyles').mockReturnValue('<html></html>');
      jest.spyOn(hbs.partials, 'foo').mockReturnValue(tpl);
      lib.setHbs(hbs);
      return lib(data, meta, res)
        .then(() => {
          expect(res.send.mock.calls[0][0]).toBe(tpl);
        });
    });

    test('rejects if the root partial is not available', () => {
      const data = mockData(),
        res = mockRes(),
        meta = mockCmptMeta();

      meta._ref = 'site.com/_components/bar/instances/bar';
      jest.spyOn(res, 'status');
      lib.setHbs(hbs);

      return lib(data, meta, res)
        .then(() => {
          expect(res.status.mock.calls[0][0]).toBe(500);
          expect(fakeLog.mock.calls[0][0]).toBe('error');
        });
    });
  });

  describe('configure', () => {
    const fn = lib['configure'];

    test('calls the mediaService configure function', () => {
      jest.spyOn(mediaService, 'configure').mockImplementation(_.noop);
      fn({ editAssetTags: true });
      expect(mediaService.configure.mock.calls.length).toBe(1);
    });
  });
});
