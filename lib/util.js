'use strict';

const _ = require('lodash');

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
      log('warn', 'Component not formatted for amp html, skipping', { cmptName: componentName });
      return 'noop-component';
    }

    return componentName;
  };
}

/**
 * Wrapper around buffer.byteLength to help with getting the byte size for strings.
 *
 * @param {String} str
 * @return Number
 */
function getByteLength(str) {
  return Buffer.byteLength(str, 'utf8');
}

module.exports.safeGetComponentName = safeGetComponentName;
module.exports.getByteLength = getByteLength;
