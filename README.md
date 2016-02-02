# multibundle

Runs requirejs bundling on multiple bundles in parallel.

[![Build Status](https://img.shields.io/travis/alexindigo/multibundle/v2.0.0.svg)](https://travis-ci.org/alexindigo/multibundle)
[![Coverage Status](https://img.shields.io/coveralls/alexindigo/multibundle/v2.0.0.svg)](https://coveralls.io/github/alexindigo/multibundle?branch=v2.0.0)
[![bitHound Overall Score](https://www.bithound.io/github/alexindigo/multibundle/badges/score.svg)](https://www.bithound.io/github/alexindigo/multibundle)

## Example

### Code

```javascript
var multibundle = require('multibundle')
  , options     = require('./options/bundles.js')
  , config      = require('./options/config.js')
  ;

// optimize
var bundler = multibundle(config, options);

bundler.on('data', function(options)
{
  console.log('Processed', options.name);
});

bundler.on('end', function()
{
  console.log('Processed all the bundles');
});

bundler.on('error', function(error)
{
  console.error(error);
});
```

### Config

```javascript
module.exports =
{
  '_config':
  {
    // 4 is silent in r.js world
    logLevel: process.env.quiet ? 4 : 1,
    destination: 'test/tmp',
    sharedBundles: ['optional', 'common'],
    // or custom function `hashFiles(output, componentOptions)`
    hashFiles: true,
    // pass options to r.js
    baseUrl: '.',
    optimize: 'uglify',
    sharedPaths:
    {
      // test location namespacing
      'app'   : 'test/fixtures/input/app',
      'assets': 'test/fixtures/input/assets',
      // needed for rendr modules
      'rendr' : 'node_modules/rendr',

      // non-existent
      'non-existent-path' : 'empty:'
    },
    preserveLicenseComments: false
  },

  // optional modules
  'optional':
  [
    {'omniture' : 'assets/vendor/s_code.js'},

    'app/lib/tracking/pixel.js',
    'app/lib/tracking/omniture.js'
  ],

  // Creates `<destination>/common.<hash>.js` file that includes all the modules specified in the bundle,
  // shared modules between all the pages.
  'common':
  [
    // node modules
    {'requirejs'    : 'node_modules/requirejs/require.js'},

    // multiple entry points module
    {'rendr/shared' : 'node_modules/rendr/shared/app.js'},
    {'rendr/client' : 'node_modules/rendr/client/router.js'},

    // module that requires files directly
    // it needs `nodeIdCompat:true`
    {'deeply'       : 'node_modules/deeply/index.js'},

    // modules needed to be shimmed
    {'async'        : {src: 'node_modules/async/lib/async.js', exports: 'async'}},
    // module with implicit dependencies
    {'backbone'     : {src: 'node_modules/backbone/backbone.js', deps: ['jquery', 'underscore', 'jqueryHammer'], exports: 'Backbone'}},

    // replace underscore with lodash
    {'underscore'   : {src: 'node_modules/lodash/index.js', exports: '_'}},

    // skip a module via `empty:`
    {'not-a-module-u-r-looking-4': 'empty:'},

    // checked in assets
    {'hammer'       : 'assets/vendor/hammer.js'},

    // assets needed to be shimmed
    {'jquery'       : {src: 'assets/vendor/jquery.js', exports: 'jQuery'}},

    // execute plugin to add methods to jQuery
    {'jqueryHammer' : {src: 'assets/vendor/jquery.hammer.js', deps: ['jquery', 'hammer'] , insertRequire: true}},

    // main script
    {'main'         : 'app/main.js'},

    // app helper files
    'app/helper*.js',

    // lib
    'app/lib/**/*.js',

    // skips "empty" module
    'non-existent-path'
  ],

  // Creates separate bundle for user page components – `<destination>/user.<hash>.js`
  'user':
  [
    'app/models/user/**/*.js',
    'app/views/user/**/*.js'
  ],

  // Creates separate bundle for map page components – `<destination>/maps.<hash>.js`
  'maps':
  [
    'app/models/maps/**/*.js',
    'app/views/maps/**/*.js'
  ]
};
```

### Output

Executes `r.js` with following configs (in parallel).

#### optional

```javascript
{
  cjsTranslate: true,
  create: true,
  removeCombined: true,
  nodeIdCompat: true,
  keepBuildDir: false,
  preserveLicenseComments: false,
  baseUrl: '.',
  name: 'optional',
  optimize: 'uglify',
  outFile: 'test/tmp/optional.js',
  packages: [],
  paths:
  {
    requirejs: 'empty:',
    'rendr/shared': 'empty:',
    'rendr/client': 'empty:',
    deeply: 'empty:',
    async: 'empty:',
    backbone: 'empty:',
    underscore: 'empty:',
    'not-a-module-u-r-looking-4': 'empty:',
    hammer: 'empty:',
    jquery: 'empty:',
    jqueryHammer: 'empty:',
    main: 'empty:',
    'app/helper': 'empty:',
    'app/lib/tracking/custom': 'empty:',
    app: 'test/fixtures/input/app',
    assets: 'test/fixtures/input/assets',
    rendr: 'node_modules/rendr',
    'non-existent-path': 'empty:',
    omniture: 'test/fixtures/input/assets/vendor/s_code'
  },
  shim: {},
  include:
  [
    'omniture',
    'app/lib/tracking/pixel',
    'app/lib/tracking/omniture'
  ],
  insertRequire: [],
  logLevel: 1,
  out: [Function]
}
```

#### common

```javascript
{ cjsTranslate: true,
  create: true,
  removeCombined: true,
  nodeIdCompat: true,
  keepBuildDir: false,
  preserveLicenseComments: false,
  baseUrl: '.',
  name: 'common',
  optimize: 'uglify',
  outFile: 'test/tmp/common.js',
  packages:
  [
    { name: 'requirejs',
      location: 'node_modules/requirejs',
      main: 'require' },
    { name: 'rendr/shared',
      location: 'node_modules/rendr/shared',
      main: 'app' },
    { name: 'rendr/client',
      location: 'node_modules/rendr/client',
      main: 'router' },
    { name: 'deeply',
      location: 'node_modules/deeply',
      main: 'index' },
    { name: 'async',
      location: 'node_modules/async/lib',
      main: 'async' },
    { name: 'backbone',
      location: 'node_modules/backbone',
      main: 'backbone' },
    { name: 'underscore',
      location: 'node_modules/lodash',
      main: 'index' } ],
  paths:
  {
    omniture: 'empty:',
    'app/lib/tracking/pixel': 'empty:',
    'app/lib/tracking/omniture': 'empty:',
    app: 'test/fixtures/input/app',
    assets: 'test/fixtures/input/assets',
    rendr: 'node_modules/rendr',
    'non-existent-path': 'empty:',
    'not-a-module-u-r-looking-4': 'empty:',
    hammer: 'test/fixtures/input/assets/vendor/hammer',
    jquery: 'test/fixtures/input/assets/vendor/jquery',
    jqueryHammer: 'test/fixtures/input/assets/vendor/jquery.hammer',
    main: 'test/fixtures/input/app/main'
  },
  shim:
  {
    async: { exports: 'async' },
    backbone: { exports: 'Backbone', deps: [Object] },
    underscore: { exports: '_' },
    jquery: { exports: 'jQuery' }
  },
  include:
  [
    'requirejs',
    'rendr/shared',
    'rendr/client',
    'deeply',
    'async',
    'backbone',
    'underscore',
    'not-a-module-u-r-looking-4',
    'hammer',
    'jquery',
    'jqueryHammer',
    'main',
    'app/helper',
    'app/lib/tracking/custom'
  ],
  insertRequire: [ 'jqueryHammer' ],
  logLevel: 1,
  out: [Function],
  exclude:
  [
    'omniture',
    'app/lib/tracking/pixel',
    'app/lib/tracking/omniture'
  ]
}
```

#### user

```javascript

{
  cjsTranslate: true,
  create: true,
  removeCombined: true,
  nodeIdCompat: true,
  keepBuildDir: false,
  preserveLicenseComments: false,
  baseUrl: '.',
  name: 'user',
  optimize: 'uglify',
  outFile: 'test/tmp/user.js',
  packages: [],
  paths:
  {
    omniture: 'empty:',
    'app/lib/tracking/pixel': 'empty:',
    'app/lib/tracking/omniture': 'empty:',
    requirejs: 'empty:',
    'rendr/shared': 'empty:',
    'rendr/client': 'empty:',
    deeply: 'empty:',
    async: 'empty:',
    backbone: 'empty:',
    underscore: 'empty:',
    'not-a-module-u-r-looking-4': 'empty:',
    hammer: 'empty:',
    jquery: 'empty:',
    jqueryHammer: 'empty:',
    main: 'empty:',
    'app/helper': 'empty:',
    'app/lib/tracking/custom': 'empty:',
    app: 'test/fixtures/input/app',
    assets: 'test/fixtures/input/assets',
    rendr: 'node_modules/rendr',
    'non-existent-path': 'empty:'
  },
  shim: {},
  include: [ 'app/models/user/user', 'app/views/user/user' ],
  insertRequire: [],
  logLevel: 1,
  out: [Function],
  exclude:
  [
    'omniture',
    'app/lib/tracking/pixel',
    'app/lib/tracking/omniture',
    'requirejs',
    'rendr/shared',
    'rendr/client',
    'deeply',
    'async',
    'backbone',
    'underscore',
    'not-a-module-u-r-looking-4',
    'hammer',
    'jquery',
    'jqueryHammer',
    'main',
    'app/helper',
    'app/lib/tracking/custom'
  ]
}
```

### maps

```javascript

{
  cjsTranslate: true,
  create: true,
  removeCombined: true,
  nodeIdCompat: true,
  keepBuildDir: false,
  preserveLicenseComments: false,
  baseUrl: '.',
  name: 'maps',
  optimize: 'uglify',
  outFile: 'test/tmp/maps.js',
  packages: [],
  paths:
  {
    omniture: 'empty:',
    'app/lib/tracking/pixel': 'empty:',
    'app/lib/tracking/omniture': 'empty:',
    requirejs: 'empty:',
    'rendr/shared': 'empty:',
    'rendr/client': 'empty:',
    deeply: 'empty:',
    async: 'empty:',
    backbone: 'empty:',
    underscore: 'empty:',
    'not-a-module-u-r-looking-4': 'empty:',
    hammer: 'empty:',
    jquery: 'empty:',
    jqueryHammer: 'empty:',
    main: 'empty:',
    'app/helper': 'empty:',
    'app/lib/tracking/custom': 'empty:',
    app: 'test/fixtures/input/app',
    assets: 'test/fixtures/input/assets',
    rendr: 'node_modules/rendr',
    'non-existent-path': 'empty:'
  },
  shim: {},
  include: [ 'app/models/maps/maps', 'app/views/maps/maps' ],
  insertRequire: [],
  logLevel: 1,
  out: [Function],
  exclude:
  [
    'omniture',
    'app/lib/tracking/pixel',
    'app/lib/tracking/omniture',
    'requirejs',
    'rendr/shared',
    'rendr/client',
    'deeply',
    'async',
    'backbone',
    'underscore',
    'not-a-module-u-r-looking-4',
    'hammer',
    'jquery',
    'jqueryHammer',
    'main',
    'app/helper',
    'app/lib/tracking/custom'
  ]
}
```

For more details check out [test folder](test/fixtures).
