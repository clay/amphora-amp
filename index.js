'use strict';

const setup = require('./lib/setup'),
  render = require('./lib/render');

module.exports.render = render;
module.exports.addResolveMedia = setup.addResolveMedia;
module.exports.addHelpers = setup.addHelpers;
module.exports.configureRender = setup.configureRender;
