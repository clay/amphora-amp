'use strict';

const clayLog = require('clay-log'),
  pkg = require('../package.json');
var amphoraAmpLogInstance;

/**
 * Initialize the logger
 */
function init() {
  if (amphoraAmpLogInstance) {
    return;
  }

  // Initialize the logger
  clayLog.init({
    name: 'amphora-amp',
    prettyPrint: true,
    meta: {
      amphoraSearchVersion: pkg.version
    }
  });

  // Store the instance
  amphoraAmpLogInstance = clayLog.getLogger();
}

/**
 * Setup new logger for a file
 *
 * @param  {Object} meta
 * @return {Function}
 */
function setup(meta = {}) {
  return clayLog.meta(meta, amphoraAmpLogInstance);
}

/**
 * Set the logger instance
 * @param {Object|Function} replacement
 */
function setLogger(replacement) {
  amphoraAmpLogInstance = replacement;
}

// Setup on first require
init();

module.exports.init = init;
module.exports.setup = setup;
module.exports.setLogger = setLogger;
