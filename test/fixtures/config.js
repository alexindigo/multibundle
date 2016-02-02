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
