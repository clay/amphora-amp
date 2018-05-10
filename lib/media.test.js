'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  setup = require('./setup'),
  files = require('nymag-fs');

describe(_.startCase(filename), function () {
  let sandbox,
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

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(files);
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
      expect(fn([])).to.deep.equal({styles: []});
    });

    it('accepts list, empty slug (non-existent components)', function () {
      expect(fn(['a', 'b', 'c'])).to.deep.equal({styles: []});
    });

    it('accepts list and slug (non-existent components)', function () {
      expect(fn(['a', 'b', 'c'], 'd')).to.deep.equal({styles: []});
    });

    it('accepts list, empty slug', function () {
      var getStyles = sandbox.stub(lib, 'getStyles');

      getStyles.withArgs('a', state.locals.site).returns(['/e/a']);
      getStyles.withArgs('b', state.locals.site).returns(['/e/b']);
      getStyles.withArgs('c', state.locals.site).returns(['/e/c', '/e/cc']);

      expect(fn({ _components: ['a', 'b', 'c'], locals: state.locals })).to.deep.equal({styles: ['/e/a', '/e/b', '/e/c', '/e/cc']});
    });
  });

  describe('getStyles', function () {
    const fn = lib[this.title];

    it('accepts bad component', function () {
      files.fileExists.returns(false);
      expect(fn('name', state.locals.site)).to.deep.equal([]);
    });

    it('accepts good component', function () {
      files.fileExists.onCall(0).returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/css/name_amp.css']);
    });

    it('accepts good component with slug (no slug file)', function () {
      files.fileExists.onCall(0).returns(true);

      expect(fn('name', {
        assetDir: '/foo'
      })).to.deep.equal(['/css/name_amp.css']);
    });

    it('accepts good component with slug (with slug file)', function () {
      files.fileExists.onCall(0).returns(true);
      files.fileExists.onCall(1).returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/css/name_amp.css', '/css/name_amp.foo.css']);
    });

    it('accepts good component with assetHost', function () {
      files.fileExists.onCall(0).returns(true);

      expect(fn('name', {
        assetDir: '/foo',
        assetHost: 'example.com'
      })).to.deep.equal(['example.com/css/name_amp.css']);
    });

    it('accepts good component with slug (with slug file) with assetDir', function () {
      files.fileExists.withArgs('/foo/css/name_amp.css').returns(true);
      files.fileExists.withArgs('/foo/css/name_amp.foo.css').returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/css/name_amp.css', '/css/name_amp.foo.css']);
    });

    it('uses the MEDIA_DIRECTORY if one is not defined on the site', function () {
      files.fileExists.withArgs(`${process.cwd()}/public/css/name_amp.css`).returns(true);
      files.fileExists.withArgs(`${process.cwd()}/public/css/name_amp.foo.css`).returns(true);

      expect(fn('name', {
        slug: 'foo'
      })).to.deep.equal(['/css/name_amp.css', '/css/name_amp.foo.css']);
    });

    it('if a styleguide is set, base component styles are not grabbed', function () {
      files.fileExists.withArgs(`${process.cwd()}/public/css/name_amp.css`).returns(true);
      files.fileExists.withArgs(`${process.cwd()}/public/css/name_amp.bar.css`).returns(true);

      expect(fn('name', {
        slug: 'foo',
        styleguide: 'bar'
      })).to.deep.equal(['/css/name_amp.bar.css']);
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
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicHtml)
          .then(resolveBody);
      });

      // Error
      it('throws an error if there is an error reading the file', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.reject(new Error()));

        return fn(state)(basicHtml)
          .catch(reject);
      });

      // Section HTML
      it('adds to top of root', function () {
        files.readFilePromise.cache = new _.memoize.Cache();

        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicSection)
          .then(resolveSection);
      });
    });
  });
});
