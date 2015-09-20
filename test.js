var util        = require('util')
  , multibundle = require('./index.js')
  , options     = require('./test/fixtures/config.js')
  , config      = options['_config']
  ;

// keep in options components only
delete options['_config'];

// optimize
var bundler = multibundle(config, options);

bundler.on('data', function(options)
{
  console.log('\n\n ++++ PROCESSED', options, ' +++++++++++++++++++++++++++ \n\n');
});

bundler.on('end', function()
{
  console.log('\n\n---DONE---\n\n');
});

bundler.on('error', function(error)
{

  console.error('\n\n +++++++++++++++ ERROR +++++++++++++ ', '\n\n', util.inspect(error, true, 4, true), '\n ++++++++++++++++++ ERROR DONE +++++++++++++++++\n\n');
  console.log(error.stack);

});
