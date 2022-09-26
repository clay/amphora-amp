'use strict';

const _ = require('lodash'),
  path = require('path'),
  bluebird = require('bluebird'),
  setup = require('./setup'),
  util = require('./util'),
  MEDIA_DIRECTORY = path.join(process.cwd(), 'public');
let log = require('./log').setup({ file: __filename });

/**
 * Put items at index in the very large target string.
 *
 * @param {string} str
 * @param {number} index
 * @param {[string]} items
 * @returns {string}
 */
function splice(str, index, items) {
  return str.substr(0, index) + items + str.substr(index);
}

/**
 * Get the contents of a string that come after specified characters.
 *
 * @param  {string} str Any string to split
 * @param  {string} dir The directory the file is in
 * @return {string}
 */
function getFileName(str, dir) {
  return str.split(dir)[1];
}

/**
 * Retrieve the contents of a file
 *
 * @param  {array} fileArray   An array of file names
 * @param  {string} targetDir  The directory to retrieve files from
 * @param  {string} filePrefix The string that comes right before the file name
 * @return {Promise}
 */
function getContentsOfFiles(fileArray, targetDir, filePrefix) {
  var allPromises = [],
    currentDir = process.cwd();

  fileArray.forEach(file => {
    allPromises.push(util.readFilePromise(path.join(currentDir, targetDir, getFileName(file, filePrefix))));
  });

  return Promise.all(allPromises)
    .catch(err => {
      throw err;
    });
}

/**
 * Concatenates an array of files into one string.
 *
 * @param  {array} fileArray   An array of files
 * @param  {string} directory  The directory in which `fs` will look for the file
 * @param  {string} filePrefix The directory path before the filename
 * @param  {string} uri of the page requested
 * @return {string}
 */
function combineFileContents(fileArray, directory, filePrefix, uri) {
  if (!fileArray || !fileArray.length) {
    return false;
  }

  // If there are files, retrieve contents
  return getContentsOfFiles(fileArray, directory, filePrefix)
    .then(function (fileContents) {
      const joined = fileContents.join(''),
        byteLength = util.getByteLength(joined);

      if (byteLength > 75000) { // see https://github.com/ampproject/amphtml/issues/26466
        log('warn', 'Combined CSS contents are beyond the 75000 byte limit specified by AMPHTML.', { uri, byteLength });
      } else if (byteLength > 70000) {
        log('info', 'Combined CSS contents are above 70000 bytes, near the 75000 byte limit specified by AMPHTML.', { uri, byteLength });
      }

      return `<style amp-custom>${joined}</style>`;
    });
}

/**
 * Locate the bottom of the <head> tag or if none exists then the
 * end of the first opening tag.
 *
 * @param {string} str
 * @return {number}
 */
function findTop(str) {
  var index = str.indexOf('</head>');

  if (index === -1) {
    index = str.indexOf('>') + 1;
  }
  return index;
}

/**
 * Append at the top of the head tag, it is a requirement of AMP that the style tag appears in the head.
 *
 * @param {array} styles
 * @param {string} html
 * @returns {string}
 */
function appendMediaToTop(styles, html) {
  var index = findTop(html);

  return splice(html, index, styles);
}

/**
 * Gets a list of all css needed for the components listed.
 *
 * NOTE: the getStyles is memoized using all arguments
 *
 * @param {Array} componentList
 * @param {string} slug
 * @returns {{styles: Array}}
 */
function getMediaMap({ _components: componentList, _layoutData, locals }) {
  const layoutName = _layoutData && _layoutData.name,
    {site} = locals || {},
    assetDir = site && site.assetDir || MEDIA_DIRECTORY,
    assetPath = site && site.assetPath || '',
    assetHost = site && site.assetHost || '';
  let componentStyles = flatMap(componentList, (componentName) => module.exports.getStyles(componentName, locals.site));

  if (layoutName) {
    const layoutStyles = module.exports.getStyles(layoutName, locals.site);

    componentStyles = _.concat(componentStyles, layoutStyles);
  }

  return {
    styles: _.map(_.filter(componentStyles, util.fileExists), pathJoin(assetHost, assetPath, assetDir))
  };
}

/**
 * @param {Array} list
 * @param {function} fn
 * @returns {Array}
 */
function flatMap(list, fn) {
  return _.filter(_.flattenDeep(_.map(list, fn)), _.identity);
}

/**
 * Get the proper styles for the component. If a styleguide is configured, use
 * that css. Defaults to the site slug
 *
 * @param {string} componentName
 * @param {object} site
 * @returns {array}
 */
function getStyles(componentName, site) {
  const stylesSource = site && site.styleguide || site && site.slug,
    assetDir = site && site.assetDir || MEDIA_DIRECTORY;

  let cssFilePaths;

  if (!site.styleguide) {
    cssFilePaths = [
      path.join(assetDir, 'css', `${componentName}_amp.css`),
      path.join(assetDir, 'css', `${componentName}_amp.${stylesSource}.css`)
    ];
  } else {
    const ampPath = path.join(assetDir, 'css', `${componentName}_amp.${stylesSource}.css`);

    cssFilePaths = util.fileExists(ampPath) ? [ampPath] : [path.join(assetDir, 'css', `${componentName}_amp._default.css`)];
  }

  return cssFilePaths;
}

/**
 * Trim the path on the file system bythe link of the
 * asset directory and then join it with either the assetHost
 * value of the site or the assetPath value (found in the
 * site's config file)
 *
 * @param  {String} assetHost
 * @param  {String} assetPath
 * @param  {String} assetDir
 * @return {Function}
 */
function pathJoin(assetHost, assetPath, assetDir) {
  var assetDirLen = assetDir.length;

  return function (filePath) {
    var pathToFile = filePath.substr(assetDirLen);

    if (assetHost) return `${assetHost}${pathToFile}`;
    return path.join(assetPath, pathToFile);
  };
}

/**
 * Set the values for inlining vs tagging edit mode styles/scripts
 *
 * @param  {object|boolean} options
 * @param {string} [cacheBuster]
 */
function configure(options, cacheBuster = '') {
  if (options && _.isObject(options)) {
    module.exports.editStylesTags = options.styles || false;
  } else {
    module.exports.editStylesTags = options;
  }
  // Assign cacheBuster
  module.exports.cacheBuster = cacheBuster;
}

/**
 * Given the state and html string...
 *
 * 1. Find all associated styles
 * 2. Run `resolveMedia`
 * 3. Stitch in the assets' contents
 * 4. Return the HTML string
 *
 * @param  {Object} state
 * @return {Function}
 */
function injectStyles(state) {
  const { locals, _self } = state;

  return function (html) {
    var mediaMap = {};

    // Check that HTML is string
    if (typeof html !== 'string') {
      throw new Error('Missing html parameter');
    }

    // We've got a string so let's actually get the map of styles
    mediaMap = module.exports.getMediaMap(state);

    // allow site to change the media map before applying it
    if (setup.resolveMedia) mediaMap = setup.resolveMedia(mediaMap, locals) || mediaMap;

    mediaMap.styles = combineFileContents(mediaMap.styles, 'public/css', '/css/', _self);

    return bluebird.props(mediaMap)
      .then(combinedFiles => {
        // If there are styles, append them
        html = combinedFiles.styles
          ? appendMediaToTop(combinedFiles.styles, html)
          : html;
        return html; // Return the compiled HTML
      });
  };
}

module.exports.injectStyles = injectStyles;
module.exports.getMediaMap = getMediaMap;
module.exports.cacheBuster = '';
module.exports.configure = configure;
module.exports.editStylesTags = false;

// For testing
module.exports.getStyles = getStyles;
module.exports.setLog = (fakeLog) => { log = fakeLog; };
