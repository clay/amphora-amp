'use strict';

const path = require('path'),
  _ = require('lodash'),
  glob = require('glob'),
  fs = require('fs'),
  handlebars = require('handlebars'),
  render = require('./render'),
  {safeGetComponentName} = require('./util'),
  nymagHbs = require('clayhandlebars'),
  hbs = nymagHbs(handlebars.create()),
  TEMPLATE_NAME = 'amp.template';
let amphoraFs = require('amphora-fs'),
  log = require('./log').setup({file: __filename});

/**
 * Initialize the package on load
 */
function init() {
  hbs.registerPartial('noop-component', '');
  // Override the `getComponentName` helper provided by clayhandlebars so that it will log on unfound
  // partials instead of breaking the render.
  hbs.registerHelper('getComponentName', safeGetComponentName(hbs, log));

  // Register partials
  registerPartials();
  // Set partials for render
  render.setHbs(module.exports.hbs);
}

/**
 * @typedef {Object} renderableItem
 * @property {string} name
 * @property {string} path
 * @returns {renderableItem[]}
 */
function getRenderableItems() {
  const items = [];

  _.each(amphoraFs.getComponents(), function (cmpt) {
    items.push({
      name: cmpt,
      path: amphoraFs.getComponentPath(cmpt)
    });
  });

  _.each(amphoraFs.getLayouts(), function (layout) {
    items.push({
      name: layout,
      path: amphoraFs.getLayoutPath(layout)
    });
  });

  return items;
}

/**
 * Register the partial with `nymag-handlebars` for reference later
 */
function registerPartials() {
  const renderableItems = getRenderableItems();

  /**
   *
   * @param {renderableItem} renderableItem
   */
  function registerRenderableItem(renderableItem) {
    const templateFile =  getPossibleTemplates(renderableItem.path, TEMPLATE_NAME),
      isHandlebars = _.includes(templateFile, '.handlebars') || _.includes(templateFile, '.hbs');
    let templateFileContents,
      modifiedTemplateFile;

    if (isHandlebars) {
      templateFileContents = fs.readFileSync(templateFile, 'utf8');

      // this wrapper guarantees we'll never render a component in a partial if it doesn't have a _ref
      modifiedTemplateFile = nymagHbs.wrapPartial(renderableItem.name, templateFileContents);

      hbs.registerPartial(renderableItem.name, modifiedTemplateFile);
    }
  }

  _.each(renderableItems, registerRenderableItem);

  // Compile all the loaded partials
  _.forIn(hbs.partials, function (value, key) {
    if (_.isString(value)) {
      hbs.partials[key] = hbs.compile(value);
    }
  });

  module.exports.hbs = hbs;
}

/**
 * Grab the possible template files based on the name.
 * Returns a path to the file so that it can be read.
 *
 * @param  {String} filePath
 * @param  {String} templateName
 * @return {String}
 */
function getPossibleTemplates(filePath, templateName) {
  if (_.isString(filePath)) {
    return _.get(glob.sync(path.join(filePath, `${templateName}.*`)), 0, []);
  }

  return [];
}

/**
 * Pass Handlebars helpers to `nymag-handlebars`
 *
 * @param {Object} payload
 */
function addHelpers(payload) {
  _.forIn(payload, function (value, key) {
    // set up handlebars helpers that rely on internal services
    hbs.registerHelper(`${key}`, value);
  });
}

/**
 * Pass settings to the renderer
 *
 * @param  {Object} options
 */
function configureRender(options) {
  render.configure(options);
  module.exports.renderSettings = options;
}

/**
 * Add in the resolveMedia function
 *
 * @param {Function} fn
 */
function addResolveMedia(fn) {
  if (typeof fn === 'function') module.exports.resolveMedia = fn;
}

// Initialize
init();
// Values assigned via functions post-instantiation
module.exports.hbs = undefined;
module.exports.renderSettings = undefined;
module.exports.resolveMedia = undefined;
module.exports.plugins = [];

// Setup functions
module.exports.init = init;
module.exports.addHelpers = addHelpers;
module.exports.configureRender = configureRender;
module.exports.addResolveMedia = addResolveMedia;

// For Testing
module.exports.setLog = (fakeLog) => { log = fakeLog; };
