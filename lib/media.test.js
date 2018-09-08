'use strict';
/* eslint max-nested-callbacks:[2,5] */

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  setup = require('./setup'),
  util = require('./util');

describe(_.startCase(filename), function () {
  let sandbox,
    fakeLog,
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
      styles: []
    },
    cssMediaMap = {
      styles: ['/css/article.css']
    };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(util);
    fakeLog = sandbox.spy();
    lib.setLog(fakeLog);
  });

  afterEach(function () {
    sandbox.restore();
    lib.editStylesTags = false;
    setup.resolveMedia = undefined;
  });

  describe('configure', function () {
    const fn = lib[this.title];

    it('sets edit styles to true if a boolean is passed in', function () {
      fn(true);

      expect(lib.editStylesTags).to.be.true;
    });

    it('sets edit styles to false if a boolean is passed in', function () {
      fn(false);

      expect(lib.editStylesTags).to.be.false;
    });

    it('sets edit styles to false if a object is passed without the property', function () {
      fn({});

      expect(lib.editStylesTags).to.be.false;
    });

    it('uses object properties to set the values', function () {
      fn({ styles: true });

      expect(lib.editStylesTags).to.be.true;
    });
  });

  describe('getMediaMap', function () {
    const fn = lib[this.title];

    it('accepts empty list, empty slug', function () {
      const state = {
        _components: []
      };

      expect(fn(state)).to.deep.equal({styles: []});
    });

    it('accepts list, empty slug (non-existent components)', function () {
      const state = {
        _components: ['a', 'b', 'c'],
        locals: {
          site: {}
        }
      };

      expect(fn(state)).to.deep.equal({styles: []});
    });

    it('accepts list and slug (non-existent components)', function () {
      const state = {
        _components: ['a', 'b', 'c'],
        locals: {
          site: {}
        }
      };

      expect(fn(state)).to.deep.equal({styles: []});
    });

    it('accepts list, empty slug', function () {
      const getStyles = sandbox.stub(lib, 'getStyles'),
        locals = {
          site: {
            slug: 'foo',
            assetDir: '/foo'
          }
        };

      getStyles.withArgs('a', locals.site).returns(['/foo/e/a']);
      getStyles.withArgs('b', locals.site).returns(['/foo/e/b']);
      getStyles.withArgs('c', locals.site).returns(['/foo/e/c', '/foo/e/cc']);

      util.fileExists.withArgs('/foo/e/a').returns(true);
      util.fileExists.withArgs('/foo/e/b').returns(true);
      util.fileExists.withArgs('/foo/e/c').returns(true);
      util.fileExists.withArgs('/foo/e/cc').returns(true);

      expect(fn({ _components: ['a', 'b', 'c'], locals }))
        .to.deep.equal({
          styles: ['/e/a', '/e/b', '/e/c', '/e/cc']
        });
    });

    it('handles a site with an assetHost', function () {
      const getStyles = sandbox.stub(lib, 'getStyles'),
        locals = {
          site: {
            slug: 'foo',
            assetDir: '/foo',
            assetHost: 'https://www.example.com'
          }
        };

      getStyles.withArgs('a', locals.site).returns(['/foo/e/a']);
      getStyles.withArgs('b', locals.site).returns(['/foo/e/b']);
      getStyles.withArgs('c', locals.site).returns(['/foo/e/c', '/foo/e/cc']);

      util.fileExists.withArgs('/foo/e/a').returns(true);
      util.fileExists.withArgs('/foo/e/b').returns(true);
      util.fileExists.withArgs('/foo/e/c').returns(true);
      util.fileExists.withArgs('/foo/e/cc').returns(true);

      expect(fn({ _components: ['a', 'b', 'c'], locals }))
        .to.deep.equal({
          styles: [
            `${locals.site.assetHost}/e/a`,
            `${locals.site.assetHost}/e/b`,
            `${locals.site.assetHost}/e/c`,
            `${locals.site.assetHost}/e/cc`
          ]
        });
    });

    it('includes layout files when the _layoutComponent is available', function () {
      const getStyles = sandbox.stub(lib, 'getStyles'),
        locals = {
          site: {
            slug: 'foo',
            assetDir: '/foo'
          }
        };

      getStyles.withArgs('a', locals.site).returns(['/foo/e/a']);
      getStyles.withArgs('b', locals.site).returns(['/foo/e/b']);
      getStyles.withArgs('c', locals.site).returns(['/foo/e/c', '/foo/e/cc']);
      getStyles.withArgs('layout', locals.site).returns(['/foo/layout']);

      util.fileExists.withArgs('/foo/e/a').returns(true);
      util.fileExists.withArgs('/foo/e/b').returns(true);
      util.fileExists.withArgs('/foo/e/c').returns(true);
      util.fileExists.withArgs('/foo/e/cc').returns(true);
      util.fileExists.withArgs('/foo/layout').returns(true);

      expect(fn({ _components: ['a', 'b', 'c'], _layoutComponent: {name: 'layout'}, locals }))
        .to.deep.equal({
          styles: ['/e/a', '/e/b', '/e/c', '/e/cc', '/layout']
        });
    });
  });

  describe('getStyles', function () {
    const fn = lib[this.title];

    it('accepts a component with slug (no slug file)', function () {
      expect(fn('name', {
        assetDir: '/foo'
      })).to.deep.equal([
        '/foo/css/name_amp.css',
        '/foo/css/name_amp.undefined.css'
      ]);
    });

    it('accepts good component with slug (with slug file)', function () {
      expect(fn('name',
        state.locals.site
      )).to.deep.equal([
        '/foo/css/name_amp.css',
        '/foo/css/name_amp.foo.css'
      ]);
    });

    it('if a styleguide is set, base component styles are not grabbed', function () {
      util.fileExists.withArgs(`${process.cwd()}/public/css/name_amp.bar.css`).returns(true);

      expect(fn('name', {
        slug: 'foo',
        styleguide: 'bar'
      })).to.deep.equal([`${process.cwd()}/public/css/name_amp.bar.css`]);
    });

    it('attempts to find the default amp style if the site specific amp style variation cannot be found', function () {
      util.fileExists.withArgs('/foo/css/name_amp.bar.css').returns(false);
      util.fileExists.withArgs('/foo/css/name_amp._default.css').returns(true);

      expect(fn('name', {
        assetDir: '/foo',
        styleguide: 'bar'
      })).to.deep.equal(['/foo/css/name_amp._default.css']);
    });
  });

  describe('injectStyles', function () {
    const fn = lib[this.title];

    it('calls resolveMedia if it\'s defined', function () {
      setup.resolveMedia = sandbox.stub().returns(emptyMediaMap);
      fn(state)(basicHtml);
      sinon.assert.calledOnce(setup.resolveMedia);
    });

    it('uses default media map if resolve media returns false', function () {
      setup.resolveMedia = sandbox.stub().returns(false);

      return fn(state)(basicHtml)
        .then(function () {
          sinon.assert.calledOnce(setup.resolveMedia);
        });
    });

    it('throws when missing html', function () {
      expect(function () {
        fn(state)();
      }).to.throw('Missing html parameter');
    });

    it('adds nothing to bottom of head when no styles', function () {
      return fn(state)(basicHtml).then((html) => {
        expect(html).to.deep.equal(basicHtml);
      });
    });

    it('if in view mode, just inlines immediately', function () {
      return fn({ locals: { edit: false } })(basicHtml).then((html) => {
        expect(html).to.deep.equal(basicHtml);
      });
    });

    it('adds nothing to top of root when no components', function () {
      return fn(state)(basicSection)
        .then(function (html) {
          expect(html).to.deep.equal(basicSection);
        });
    });

    it('adds nothing to bottom of root when no components', function () {
      return fn(state)(basicHtml)
        .then(function (html) {
          expect(html).to.deep.equal(basicHtml);
        });
    });

    describe('with styles', function () {
      function reject(err) {
        expect(err).to.be.an.instanceOf(Error);
      }

      function resolveBody(html) {
        expect(html).to.deep.equal(componentStyleHtml);
      }

      function resolveSection(html) {
        expect(html).to.deep.equal(componentStyleSection);
      }

      // Body HTML
      it('adds to top of head', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        util.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicHtml)
          .then(resolveBody);
      });

      // Error
      it('throws an error if there is an error reading the file', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        util.readFilePromise.onCall(0).returns(Promise.reject(new Error()));

        return fn(state)(basicHtml)
          .catch(reject);
      });

      // Section HTML
      it('adds to top of root', function () {
        util.readFilePromise.cache = new _.memoize.Cache();

        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        util.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      it('logs when the combined file contents are too large', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        util.readFilePromise.onCall(0).returns(Promise.resolve(styleString));
        util.getByteLength.returns(50001);

        return fn(state)(basicHtml)
          .then(() => {
            expect(fakeLog.withArgs(
              'warn',
              'Combined CSS contents are beyond the 50000 byte limit specified by AMPHTML.'
            ).calledOnce).eql(true);
          });
      });
    });
  });
});
