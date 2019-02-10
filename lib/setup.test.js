'use strict';

const _ = require('lodash'),
  fs = require('fs'),
  glob = require('glob'),
  amphoraFs = require('amphora-fs'),
  nymagHbs = require('clayhandlebars'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  render = require('./render');

jest.mock('fs', () => ({
  readdirSync: () => '',
  readFileSync: () => ''
}));

describe(_.startCase(filename), () => {
  let fakeLog;

  beforeEach(() => {
    fakeLog = jest.fn();

    jest.spyOn(glob, 'sync');
    jest.spyOn(amphoraFs, 'getComponents');
    jest.spyOn(amphoraFs, 'getComponentPath');
    jest.spyOn(render, 'configure');
    lib.setLog(fakeLog);
  });

  describe('init', () => {
    const fn = lib['init'];

    test.skip(
      'builds default partials and partials from the components directory',
      () => {
        amphoraFs.getComponents.mockReturnValue(['c1', 'c2', 'c3', 'c4']);
        amphoraFs.getComponentPath.mockImplementation((name) => {
          if (name === 'c1') return '/components/c1';
          if (name === 'c2') return '/components/c2';
          if (name === 'c3') return '/components/c3';
          if (name === 'c4') return null;
          return undefined;
        });

        glob.sync.mockImplementation((path) => {
          if (path === '/components/c1/amp.template.*') return ['/components/c1/amp.template.handlebars'];
          if (path === '/components/c2/amp.template.*') return ['/components/c2/amp.template.hbs'];
          if (path === '/components/c3/amp.template.*') return ['/components/c3/amp.template.nunjucks'];
          return null;
        });

        jest.spyOn(fs, 'readFileSync');
        jest.spyOn(nymagHbs, 'wrapPartial').mockImplementation((componentName) => {
          if (componentName === 'c1') return 'hello, world';
          return {};
        });

        jest.spyOn(lib.hbs, 'registerHelper');
        jest.spyOn(lib.hbs, 'registerPartial');

        fn();

        // it registers a getComponentName helper
        expect(lib.hbs.registerHelper.mock.calls.length).toBe(1);
        expect(lib.hbs.registerHelper.mock.calls[0][0]).toBe('getComponentName');

        // it registers all the appropriate partials
        expect(lib.hbs.registerPartial.mock.calls.length).toBe(3);
        expect(
          _.map(lib.hbs.registerPartial.mock.calls, function (item) {
            return _.get(item, '0');
          })
        ).toContain('noop-component');
        expect(
          _.map(lib.hbs.registerPartial.mock.calls, function (item) {
            return _.get(item, '0');
          })
        ).toContain('c1');
        expect(
          _.map(lib.hbs.registerPartial.mock.calls, function (item) {
            return _.get(item, '0');
          })
        ).toContain('c2');
      }
    );
  });

  describe('addHelpers', () => {
    const fn = lib['addHelpers'];

    test.skip('calls the `registerHelper` function for each prop/value', () => {
      jest.spyOn(lib.hbs, 'registerHelper');
      fn({test: _.noop});
      expect(lib.hbs.registerHelper.mock.calls[0]).toEqual([
        'test',
        _.noop
      ]);
    });
  });

  describe('configureRender', () => {
    const fn = lib['configureRender'];

    test('calls the render `configure` function', () => {
      jest.spyOn(render, 'configure');
      fn({ foo: 'bar' });
      expect(render.configure.mock.calls.length).toBe(1);
    });

    test('exposes the render options on the module', () => {
      fn({ foo: 'bar' });

      expect(lib.renderSettings).toEqual({ foo: 'bar' });
    });
  });

  describe('addResolveMedia', () => {
    const fn = lib['addResolveMedia'];

    afterEach(function () {
      lib.resolveMedia = undefined;
    });

    test('attaches resolveMedia to the module if it is a function', () => {
      fn(_.noop);

      expect(typeof lib.resolveMedia).toBe('function');
    });

    test('does not attach non-function arguments', () => {
      fn(1);

      expect(typeof lib.resolveMedia).not.toBe('function');
    });
  });
});
