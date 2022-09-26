'use strict';
/* eslint max-nested-callbacks:[2,5] */

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  setup = require('./setup'),
  util = require('./util');

jest.mock('./util');

describe(_.startCase(filename), () => {
  let fakeLog,
    basicHtml = '<html><head></head><body></body></html>',
    basicSection = '<section><header></header><footer></footer></section>',
    styleString = '.test { color: red; }',
    componentStyleHtml = '<html><head><style amp-custom>' + styleString + '</style></head><body></body></html>',
    componentStyleSection = '<section><style amp-custom>' + styleString + '</style><header></header><footer></footer></section>';

  const state = {
      locals: {
        site: {
          slug: 'foo',
          assetDir: '/foo'
        }
      }
    },
    emptyMediaMap = {
      scripts: [],
      styles: []
    },
    cssMediaMap = {
      scripts: [],
      styles: ['/css/article.css']
    };

  beforeEach(() => {
    fakeLog = jest.fn();
    lib.setLog(fakeLog);
  });

  afterEach(() => {
    lib.editStylesTags = false;
    setup.resolveMedia = undefined;
  });

  describe('configure', () => {
    const fn = lib['configure'];

    test('sets edit styles to true if a boolean is passed in', () => {
      fn(true);

      expect(lib.editStylesTags).toBe(true);
    });

    test('sets edit styles to false if a boolean is passed in', () => {
      fn(false);

      expect(lib.editStylesTags).toBe(false);
    });

    test(
      'sets edit styles to false if a object is passed without the property',
      () => {
        fn({});

        expect(lib.editStylesTags).toBe(false);
      }
    );

    test('uses object properties to set the values', () => {
      fn({ styles: true });

      expect(lib.editStylesTags).toBe(true);
    });
  });

  describe('getMediaMap', () => {
    const fn = lib['getMediaMap'];

    test('accepts empty list, empty slug', () => {
      expect(
        fn(
          {
            _components: []
          }
        )
      ).toEqual({styles: []});
    });

    test('accepts list, empty slug (non-existent components)', () => {
      jest.spyOn(lib, 'getStyles').mockImplementation(function () {
        return [];
      });
      expect(
        fn(
          {
            _components: ['a', 'b', 'c'],
            locals: {}
          }
        )
      ).toEqual({styles: []});
    });

    test('accepts list and slug (non-existent components)', () => {
      expect(
        fn(
          {
            _components: ['a', 'b', 'c'],
            locals: {
              site: {}
            }
          }
        )
      ).toEqual({styles: []});
    });

    test('accepts list, empty slug', () => {
      util.fileExists.mockReturnValue(true);
      jest.spyOn(lib, 'getStyles').mockImplementation(function (name, {}) {
        if (name === 'a') return ['/public/e/a'];
        if (name === 'b') return ['/public/e/b'];
        if (name === 'c') return ['/public/e/c', '/public/e/cc'];
        return [];
      });

      expect(
        fn({
          _components: ['a', 'b', 'c'],
          locals: {
            site: {
              slug: 'foo',
              assetDir: '/public',
              assetPath: ''
            }
          }
        })
      ).toEqual({styles: ['/e/a', '/e/b', '/e/c', '/e/cc']});
    });

    test('include the layout style if layout data exists', () => {
      util.fileExists.mockReturnValue(true);
      expect(
        fn(
          {
            _components: ['a', 'b', 'c'],
            _layoutData: {
              name: 'l1'
            },
            locals: {
              site: {
                slug: 'foo',
                assetDir: '/public',
                assetPath: ''
              }
            }
          }
        ).styles
      ).toContain('/css/l1_amp.css');
    });

    test('utilize the assetHost to build paths when specified', () => {
      util.fileExists.mockReturnValue(true);
      expect(
        fn(
          {
            _components: ['a'],
            _layoutData: {
              name: 'l1'
            },
            locals: {
              site: {
                slug: 'foo',
                assetDir: '/public',
                assetPath: '',
                assetHost: 'assets.example.com'
              }
            }
          }
        ).styles
      ).toContain('assets.example.com/css/l1_amp.css');
    });
  });

  describe('getStyles', () => {
    const fn = lib['getStyles'];

    test('handles an empty styleguide', () => {
      util.fileExists.mockReturnValue(true);
      expect(fn('name', state.locals.site)).toEqual([
        `${state.locals.site.assetDir}/css/name_amp.css`,
        `${state.locals.site.assetDir}/css/name_amp.${state.locals.site.slug}.css`
      ]);
    });

    test('handles getting pathes with a styleguide', () => {
      const site = {
        assetDir: '/public',
        styleguide: 'tc'
      };

      util.fileExists.mockReturnValue(true);
      expect(fn('name', site)).toEqual([
        `${site.assetDir}/css/name_amp.${site.styleguide}.css`
      ]);
    });

    test('falls back to the _default styleguide if the styleguide specific file does not exist', () => {
      const site = {
        assetDir: '/public',
        styleguide: 'tc'
      };

      util.fileExists.mockReturnValue(false);
      expect(fn('name', site)).toEqual([
        `${site.assetDir}/css/name_amp._default.css`
      ]);
    });

    test(
      'uses the MEDIA_DIRECTORY if one is not defined on the site',
      () => {
        const site = {
          styleguide: 'tc'
        };

        util.fileExists.mockReturnValue(true);

        expect(fn('name', site)).toEqual([
          `${process.cwd()}/public/css/name_amp.${site.styleguide}.css`
        ]);
      }
    );
  });

  describe('injectStyles', () => {
    const fn = lib['injectStyles'];

    test('calls resolveMedia if it\'s defined', () => {
      setup.resolveMedia = jest.fn().mockReturnValue(emptyMediaMap);
      return fn(state)(basicHtml).then(function () {
        expect(setup.resolveMedia.mock.calls.length).toBe(1);
      });
    });

    test('uses default media map if resolve media returns false', () => {
      setup.resolveMedia = jest.fn().mockReturnValue(false);

      return fn(state)(basicHtml)
        .then(function () {
          expect(setup.resolveMedia.mock.calls.length).toBe(1);
        });
    });

    test('throws when missing html', () => {
      expect.assertions(1);
      expect(() => {
        fn(state)();
      }).toThrowError('Missing html parameter');
    });

    test('adds nothing to bottom of head when no styles', () => {
      return fn(state)(basicHtml).then((html) => {
        expect(html).toEqual(basicHtml);
      });
    });

    test('if in view mode, just inlines immediately', () => {
      return fn({ locals: { edit: false, site: {} }, _components: [] })(basicHtml).then((html) => {
        expect(html).toEqual(basicHtml);
      });
    });

    test('adds nothing to top of root when no components', () => {
      return fn(state)(basicSection)
        .then(function (html) {
          expect(html).toEqual(basicSection);
        });
    });

    test('adds nothing to bottom of root when no components', () => {
      return fn(state)(basicHtml)
        .then(function (html) {
          expect(html).toEqual(basicHtml);
        });
    });

    describe('with styles', () => {

      function resolveBody(html) {
        expect(html).toEqual(componentStyleHtml);
      }

      function resolveSection(html) {
        expect(html).toEqual(componentStyleSection);
      }

      // Body HTML
      test('adds to bottom of head', () => {
        util.readFilePromise.cache = new _.memoize.Cache();

        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(cssMediaMap));
        jest.spyOn(util, 'readFilePromise').mockReturnValue(Promise.resolve(styleString));

        return fn(state)(basicHtml)
          .then(resolveBody);
      });

      // Error
      test('throws an error if there is an error reading the file', () => {
        util.readFilePromise.cache = new _.memoize.Cache();
        expect.assertions(1);

        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(cssMediaMap));
        jest.spyOn(util, 'readFilePromise').mockReturnValue(Promise.reject('darn'));

        return expect(fn(state)(basicHtml)).rejects.toMatch('darn');
      });

      // Section HTML
      test('adds to top of root', () => {
        util.readFilePromise.cache = new _.memoize.Cache();

        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(cssMediaMap));
        jest.spyOn(util, 'readFilePromise').mockReturnValue(Promise.resolve(styleString));

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      test('logs when the combined file contents are too large', () => {
        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(cssMediaMap));
        jest.spyOn(util, 'readFilePromise').mockReturnValue(Promise.resolve(styleString));
        jest.spyOn(util, 'getByteLength').mockReturnValue(75001);

        return fn(state)(basicHtml)
          .then(() => {
            expect(fakeLog.mock.calls).toEqual([
              [
                'warn',
                'Combined CSS contents are beyond the 75000 byte limit specified by AMPHTML.'
              ]
            ]);
          });
      });
    });
  });
});
