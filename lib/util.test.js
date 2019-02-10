'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename);

describe(_.startCase(filename), () => {
  let fakeLog;

  beforeEach(() => {
    fakeLog = jest.fn();
  });

  describe('safeGetComponentName', () => {
    const fn = lib['safeGetComponentName'];

    test(
      'returns the noop component when a component name cannot be extracted from the ref',
      () => {
        const helper = fn({partials: {}}, fakeLog);

        expect(helper('foo')).toBe('noop-component');
        expect(fakeLog.mock.calls.length).toBe(0);
      }
    );

    test(
      'returns the noop component when there is no partial for the component name in the ref',
      () => {
        const helper = fn({partials: {}}, fakeLog);

        expect(helper('_components/foo')).toBe('noop-component');
        expect(fakeLog.mock.calls.length).toBe(1);
        expect(fakeLog.mock.calls[0]).toEqual([
          'debug',
          'Component not formatted for amp html, skipping',
          {
            cmptName: 'foo'
          }
        ]);
      }
    );

    test(
      'returns the component name if there is a corresponding partial',
      () => {
        const helper = fn({partials: {foo: 'foo'}}, fakeLog);

        expect(helper('_components/foo')).toBe('foo');
        expect(fakeLog.mock.calls.length).toBe(0);
      }
    );
  });

  describe('getByteLength', () => {
    const fn = lib['getByteLength'];

    test('returns byte length of an empty string', () => {
      expect(fn('')).toBe(0);
    });

    test('returns byte length of a string with content', () => {
      expect(fn('abc_123')).toBe(7);
    });
  });

  describe('memoize', () => {
    let memLeak;
    const fn = lib['memoize'];

    beforeEach(() => {
      memLeak = lib.getMemoryLeakThreshold();
    });

    afterEach(() => {
      lib.setMemoryLeakThreshold(memLeak);
    });

    test(
      'memoizes the input function based on the first parameter specified in the memoization',
      () => {
        const resultFn = fn(function () { return 'd'; }, fakeLog);

        resultFn('a', 'b', 'c');

        expect(_.get(resultFn, 'cache.__data__.string.__data__')).toEqual({a: 'd'});
      }
    );

    test('memoizes with a set method', () => {
      const resultFn = fn(function () { return 'd'; }, fakeLog);

      resultFn('a', 'b', 'c');
      resultFn.cache = {};

      expect(_.get(resultFn, 'cache.__data__.string.__data__')).toBeUndefined();
    });

    test('warns when over the memoization limit', () => {
      const resultFn = fn(function namedFn() { return 'd'; }, fakeLog);

      jest.useFakeTimers();

      lib.setMemoryLeakThreshold(0);

      resultFn('a');
      resultFn('b');
      resultFn('c');

      expect(fakeLog.mock.calls.length).toBe(1);

      jest.advanceTimersByTime(60000);
      jest.useRealTimers();
    });
  });

  describe('defineWritable', () => {
    const fn = lib['defineWritable'];

    test('sets writable when get and set are not supplied', () => {
      expect(fn({}).writable).toBe(true);
    });

    test('overrides writable if get and set are not supplied', () => {
      expect(fn({writable: false}).writable).toBe(true);
    });

    test('does not set writable when get or set are supplied', () => {
      expect(fn({get: '1'}).writable).toBeUndefined();
    });

    test('does not override writable if get or set is supplied', () => {
      expect(fn({writable: false, get: '1'}).writable).toBe(false);
    });
  });
});
