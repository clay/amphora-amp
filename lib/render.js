'use strict';

const _ = require('lodash'),
  clayUtils = require('clayutils'),
  mediaService = require('./media');

let log = require('./log').setup({ file: __filename }),
  amphoraFs = require('amphora-fs'),
  hbs;

/**
 * Log the render time
 *
 * @param  {Object} hrStart
 * @param  {String} msg
 * @param  {String} route
 * @return {Function}
 */
function logTime(hrStart, msg, route) {
  return () => {
    const diff = process.hrtime(hrStart),
      ms = Math.floor((diff[0] * 1e9 + diff[1]) / 1000000);

    log('info', `${msg}: ${route} (${ms}ms)`, {
      renderTime: ms,
      route,
      type: 'html'
    });
  };
}

/**
 * Construct the object that is needed for rendering. Requires reading
 * from the file system.
 *
 * @param  {Object} data
 * @param  {Object} meta
 * @return {Object}
 */
function makeState(data, meta) {
  const indices = amphoraFs.getIndices(meta._layoutRef || meta._ref, data),
    componentList = indices && indices.components || [];
  let initialState = {};

  // Make an affordance for _self, which was conistently implemented in Amphora pre-v7.
  initialState._self = meta._ref;
  initialState._components = componentList;

  if (meta._layoutRef) {
    const layoutName = clayUtils.getLayoutName(meta._layoutRef);

    initialState._layoutComponent = { name: layoutName, uri: meta._layoutRef };
  }

  return  _.assign(initialState, _.pick(meta, ['_layoutRef', 'locals']));
}

/**
 * Given the state, find the root component, compose
 * the data into a structure for rendering AMPHTML
 *
 * @param  {Object} state
 * @return {Function<String>}
 */
function makeHtml(state) {
  return function (_data) {
    const template = state._layoutComponent
        ? clayUtils.getLayoutName(state._layoutComponent.uri)
        : clayUtils.getComponentName(state._self),
      rootPartial = hbs.partials[template];

    if (!rootPartial) {
      throw new Error(`Missing template for ${template}`);
    }

    // At the final stage of rendering we need to smoosh
    // all the data together with the state.
    return rootPartial(_.assign(state, _data));
  };
}

function render(data, meta, res) {
  const hrStart = process.hrtime(),
    state = makeState(data, meta);

  return Promise.resolve(data)
    .then(makeHtml(state))
    .then(mediaService.injectStyles(state))
    .then(result => {
      res.type('text/html');
      res.send(result);
    })
    .then(logTime(hrStart, 'rendered route', state.locals.url))
    .catch(err => {
      log('error', err.message, { stack: err.stack });
      res.status(500);
      res.send(err);
    });
};

function configure({ editAssetTags, cacheBuster }) {
  mediaService.configure(editAssetTags, cacheBuster);
}

module.exports = render;
module.exports.configure = configure;
module.exports.setHbs = (val) => { hbs = val; };

// exported for testing
module.exports.makeState = makeState;
module.exports.setLog = (fakeLog) => { log = fakeLog; };
