'use strict';

const _ = require('lodash'),
  amphoraFs = require('amphora-fs'),
  minute = 60000;
let memoryLeakThreshold = 32768;

/**
 * Given a Handlebars instance build a safe version of getComponentName such that it can handle
 * if a partial does not exist in our Handlebars instance.
 *
 * @param {Object} hbs - Handlebars instance for this renderer.
 * @param {Function} log - Logger instance so we can appropraitely log when a component has no associated partial.
 * @returns {Function}
 */
function safeGetComponentName(hbs, log) {
  return function (ref) {
    const result = /components\/(.+?)[\/\.]/.exec(ref) || /components\/(.*)/.exec(ref),
      componentName = result && result[1];

    if (!componentName) {
      return 'noop-component';
    }

    if (!_.get(hbs.partials, componentName)) {
      log('debug', 'Component not formatted for amp html, skipping', { cmptName: componentName });
      return 'noop-component';
    }

    return componentName;
  };
}

/**
 * Wrapper around buffer.byteLength to help with getting the byte size for strings.
 *
 * @param {String} str
 * @returns {Number}
 */
function getByteLength(str) {
  return Buffer.byteLength(str, 'utf8');
}

function defineWritable(definition) {
  if (!definition.set && !definition.get) {
    definition.writable = true;
  }
  definition.enumerable = false;
  definition.configurable = false;
  return definition;
}

function getMemoryLeakThreshold() {
  return memoryLeakThreshold;
}

function setMemoryLeakThreshold(value) {
  memoryLeakThreshold = value;
}

/**
 * Report that a memory leak occurred
 * @param {Function} fn
 * @param {Object} cache
 * @param {Function} log
 */
function reportMemoryLeak(fn, cache, log) {
  log('warn', 'memory leak', fn.name, cache);
}

/**
 * Memoize, but warn if the target is not suitable for memoization
 * @param {Function} fn
 * @param {Function} log
 * @returns {Function}
 */
function memoize(fn, log) {
  const dataProp = '__data__.string.__data__',
    memFn = _.memoize.apply(_, _.slice(arguments, 0, 1)),
    report = _.throttle(reportMemoryLeak, minute),
    controlFn = function () {
      const result = memFn.apply(null, _.slice(arguments));

      if (_.size(_.get(memFn, `cache.${dataProp}`)) >= memoryLeakThreshold) {
        report(fn, _.get(memFn, `cache.${dataProp}`), log);
      }

      return result;
    };

  Object.defineProperty(controlFn, 'cache', defineWritable({
    get() { return memFn.cache; },
    set(value) { memFn.cache = value; }
  }));

  return controlFn;
}

module.exports.safeGetComponentName = safeGetComponentName;
module.exports.getByteLength = getByteLength;
module.exports.fileExists = memoize(amphoraFs.fileExists);
module.exports.readFilePromise = memoize(amphoraFs.readFilePromise);

// Exported for testing
module.exports.memoize = memoize;
module.exports.defineWritable = defineWritable;
module.exports.getMemoryLeakThreshold = getMemoryLeakThreshold;
module.exports.setMemoryLeakThreshold = setMemoryLeakThreshold;
