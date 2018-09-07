# Amphora AMP HTML

[![CircleCI](https://circleci.com/gh/clay/amphora-amp/tree/master.svg?style=svg)](https://circleci.com/gh/clay/amphora-amp/tree/master) [![Coverage Status](https://coveralls.io/repos/github/clay/amphora-amp/badge.svg?branch=master)](https://coveralls.io/github/clay/amphora-amp?branch=master)

The [AMP HTML Format](https://www.ampproject.org/docs/) renderer for Clay components.

## Install
`$ npm install --save amphora-amp`

## Integration

### Basic Configuration

First, ensure that you have a compatible version of Amphora installed (v3.x or greater) and require `amphora-amp` at the from wherever you are running Amphora.

```
const amphoraAmp = require('amphora-amp');
```

### Component Rendering

To make a Clay component renderable for AMP HTML, add a `amp.template.hbs` file to your component's directory.  Additionally if you need to include styles for your component you will need to add an `amp` variation of your component in your `public/css` directory which will be inlined similarly to how CSS is inlined for [amphora-html](https://github.com/clay/amphora-html).  An example directory structure might look like:

```
components
  clay-paragraph
    amp.template.hbs
public
  css
    clay-paragraph_amp.css
```

### Handlebars Helpers

Similar to `amphora-html`, if your templates require any custom [Handlebars Helpers](http://handlebarsjs.com/block_helpers.html) you can register them with the renderer's Handlebars instance. Simply pass in an object whose keys are the names of your helpers and whose values are the helper themselves. Like so:

```javascript
// My helpers
const helpers = {
  // set up handlebars helpers that rely on internal services
  'nameOfHelper': () => {
    // helper that does something you need.
    return 'foobar';
  }
};

// Register helpers
amphoraAmp.addHelpers(helpers);
```

### Register Amphora AMP with your Amphora Instance

Now that you have registered any helpers you can register your renderer with Amphora. Registering consists of providing a `renderers` object whose keys are the extension of an HTTP request and whose values are the renderer.

```javascript
return amphora({
  app: app,
  renderers: {
    amp: amphoraAmp,
    html: amphoraHtml,
    default: 'html'
  },
  providers: ['apikey', amphoraProvider],
  sessionStore: redisStore,
  plugins: [
    amphoraSearch
  ]
});
```

This will allow you to render when the extension is explicitly specified (i.e. using a URL like `example.com/article.amp`), if you want to have other routes render using the AMP renderer you will need to create routes in your Express app which include the `:ext` param (see [the amphora rendering logic](https://github.com/clay/amphora/blob/master/lib/render.js#L26)) for how the determination of which extension is considered for a route.  An example of an Express route with this format would be:

```
var express = require('express');
var app = express();

app.get('/:ext/article/:name', ...);
```

So that if we hit a URL like `example.com/amp/article/article.html` it will serve using the AMP renderer.

## Contributing
Want a feature or find a bug? Create an issue or a PR and someone will get on it.