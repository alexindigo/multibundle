var fs           = require('fs')
  , assert       = require('assert')
  , multibundle  = require('./index.js')
  , options      = require('./test/fixtures/config.js')
  , config       = options['_config']
  , expectedPath = 'test/fixtures/expected/'
  , bundlesNum
  ;

// keep in options components only
delete options['_config'];
bundlesNum = Object.keys(options).length;

// optimize
var bundler = multibundle(config, options);

bundler.on('data', function(options)
{
  var expected  = fs.readFileSync(expectedPath + options.name + '.js', {encoding: 'utf8'})
    , generated = fs.readFileSync(options.outFile, {encoding: 'utf8'})
    ;

  assert.equal(expected, generated, 'Expected generated bundle to match fixture');
  bundlesNum--;

//  console.log('\n\n ++++ PROCESSED', options, ' +++++++++++++++++++++++++++ \n\n');
});

bundler.on('end', function()
{
  assert.strictEqual(bundlesNum, 0, 'Expected to successfully process all bundles');
});

bundler.on('error', function(error)
{
  assert.fail(error);
});
