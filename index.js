/**
 * Runs requirejs bundling on multiple bundles in parallel.
 *
 * @module Multibundle
 */

var fs          = require('fs')
  , path        = require('path')
  , util        = require('util')
  , crypto      = require('crypto')
  , child       = require('child_process')
  , cpus        = require('os').cpus()
  , Readable    = require('stream').Readable
    // third-party
  , glob        = require('glob')
  , async       = require('async')
  , lodash      = require('lodash')
    // static
  , bundlerPath = path.join(__dirname, 'bundler.js')
  ;

// API
module.exports = Multibundle;
util.inherits(Multibundle, Readable);

// defaults
Multibundle._defaults =
{
  sharedPaths: {},
  parallelLimit: cpus.length,
  // TRACE: 0,
  // INFO: 1,
  // WARN: 2,
  // ERROR: 3,
  // SILENT: 4
  logLevel: 1
};

/**
 * Parses multibundle config and transforms it into requirejs compatible options.
 *
 * @constructor
 * @param {object} config - process configuration object
 * @param {array} components - list of bundles to build
 * @alias module:Multibundle
 */
function Multibundle(config, components)
{
  var tasks;

  if (!(this instanceof Multibundle))
  {
    return new Multibundle(config, components);
  }

  // turn on object mode
  Readable.call(this, {objectMode: true});

  // prepare config options
  this.config = lodash.merge({}, Multibundle._defaults, config);
  this.config.componentOptions = lodash.cloneDeep(components);

  // process each component in specific order
  tasks = this._getComponents()
    .map(this._processComponent.bind(this))
    .map(this._prepareForRjs.bind(this))
    ;

  // run optimize tasks asynchronously
  async.parallelLimit(tasks, this.config.parallelLimit, function(err)
  {
    if (err)
    {
      this.emit('error', err);
      return;
    }

    // be nice
    if (this.config.logLevel < 4)
    {
      console.log('\n-- All requirejs bundles have been processed.');
    }

    // singal end of the stream
    this.push(null);
  }.bind(this));
}

/**
 * Creates list of components to process with shared bundles being first in the list
 *
 * @private
 * @returns {array} list of component handles
 */
Multibundle.prototype._getComponents = function()
{
  var components = lodash.without.apply(null, [Object.keys(this.config.componentOptions)].concat(this.config.sharedBundles || []));

  // add sharedBundles in the beginning of the components list
  components.unshift.apply(components, this.config.sharedBundles || []);

  return components;
};

/**
 * Assembles r.js options for the component
 *
 * @private
 * @param   {string} component - component name to process
 * @returns {object} r.js ready bundling options hash
 */
Multibundle.prototype._processComponent = function(component)
{
  var options =
    {
      cjsTranslate           : true,
      create                 : true,
      removeCombined         : true,
      nodeIdCompat           : true,
      keepBuildDir           : false,
      preserveLicenseComments: this.config.preserveLicenseComments || false,
      baseUrl                : this.config.baseUrl,
      name                   : component,
      optimize               : this.config.optimize || 'none',
      outFile                : path.join((this.config.destination || this.config.baseUrl), component + '.js'),
      packages               : [],
      paths                  : lodash.cloneDeep(this.config.sharedPaths || {}),
      shim                   : {},
      include                : [],
      insertRequire          : [],
      logLevel               : this.config.logLevel
    }
  ;

  // handle requirejs output "manually"
  options.out = this._handleOutput.bind(this, options);

  // fill in with modules
  this.config.componentOptions[component].forEach(this._processItem.bind(this, options));

  // shared bundles includes are excludes for other bundles
  this._excludeIncludes(options);

  return options;
};

/**
 * Converts options object into async.parallel ready function
 * to process component with r.js
 *
 * @private
 * @param   {object} options - r.js options for the component
 * @returns {function} async.parallel ready function
 */
Multibundle.prototype._prepareForRjs = function(options)
{
  // update exclude and paths list
  // after all (shared) bundles were processed
  this._excludeIncludes(options);

  return this._asyncOptimize.bind(this, options);
};

/**
 * Forks child process to execute r.js with provided options
 *
 * @private
 * @param   {object} options - r.js options for the component
 * @param   {function} callback - invoked when child process finished
 */
Multibundle.prototype._asyncOptimize = function(options, callback)
{
  var bundler = child.fork(bundlerPath, [], {cwd: process.cwd()});

  // pass component options
  bundler.send({component: options});

  // wait for response
  bundler.on('message', function(msg)
  {
    // Make requirejs's stdout more readable
    if (msg.stdout)
    {
      console.log(msg.stdout
        .replace('FUNCTION', '+ building "' + options.name + '" bundle')
        .replace(/\s*$/, '\n----------------')
      );
    }

    // pass error to upstream
    if (msg.err)
    {
      callback(msg.err);
      return;
    }

    // pass data to the component.out handler
    if (msg.done)
    {
      options.out(msg.done, function(err)
      {
        if (err)
        {
          this.emit('error', err);
          return;
        }

        // send options to all readers
        this.push(options);

        // silent is number 4 in r.js world
        if (this.config.logLevel < 4)
        {
          console.log('Finished "' + options.name + '" bundle.');
        }

        callback(null, options.name);
      }.bind(this));

      return;
    }
  }.bind(this));
};

/**
 * Converts component item into proper r.js component options
 *
 * @private
 * @param   {object} options - r.js options for the component
 * @param   {object|string} item - item to bundle with the component
 */
Multibundle.prototype._processItem = function(options, item)
{
  var name
    , file
    , baseCwd = path.resolve(process.cwd(), this.config.baseUrl);

  // we can have either a string or an object
  if (typeof item == 'string')
  {
    // compare notes with mapping
    file = this._expandItem(item);

    // skip if it's empty path
    if (file == 'empty:')
    {
      return;
    }

    // add item to the config
    // if item has glob patterns - unfold it
    if (glob.hasMagic(file))
    {
      // unfold path and add to include list
      options.include = options.include.concat(
        glob.sync(file, {cwd: baseCwd, ignore: (this.config.includedInShared || []).map(this._expandItem.bind(this, '.js'))})
        .map(this._stripExtension.bind(this))
        .map(this._abridgeItem.bind(this))
        || [] // if nothing found
      );
    }
    else
    {
      options.include.push(this._stripExtension(item));
    }
  }
  else
  {
    // if its an object expect it to be single key
    name = Object.keys(item)[0];

    // add item to the config
    options.include.push(name);

    // item could be a path to the file
    // or options object with extra parameters
    if (typeof item[name] == 'string')
    {
      this._addModule(options, name, item[name]);
    }
    else
    {
      this._addModule(options, name, item[name].src);

      // process extra params
      if (item[name].exports)
      {
        options.shim[name] = {exports: item[name].exports};

        // throw dependencies into mix
        if (item[name].deps)
        {
          options.shim[name].deps = item[name].deps;
        }
      }

      // check for forced require
      if (item[name].insertRequire)
      {
        options.insertRequire.push(name);
      }
    }
  }
};

/**
 * Expands provided glob pattern with path from mapping hash
 *
 * @private
 * @param   {string} [ext] - extension to add to the item
 * @param   {string} item - item to bundle with the component
 * @returns {string} resulted path
 */
Multibundle.prototype._expandItem = function(ext, item)
{
  // ext is optional
  if (ext && !item)
  {
    item = ext;
    ext  = null;
  }

  // sort prefixes long to short
  var i, prefixes = Object.keys(this.config.sharedPaths).sort(function(a, b){return b.length - a.length;});

  for (i = 0; i < prefixes.length; i++)
  {
    if (item.substr(0, prefixes[i].length) == prefixes[i])
    {
      if (this.config.sharedPaths[prefixes[i]] == 'empty:')
      {
        item = 'empty:';
      }
      else
      {
        item = item.replace(prefixes[i], this.config.sharedPaths[prefixes[i]]);
      }
      break;
    }
  }

  // add extension
  if (ext) item += ext;

  return item;
};

/**
 * Undoes expansion of provided item with path from mapping hash
 *
 * @private
 * @param   {string} item - item to bundle with the component
 * @returns {string} resulted path
 */
Multibundle.prototype._abridgeItem = function(item)
{
  // sort prefixes long to short
  var i, prefixes = Object.keys(this.config.sharedPaths).sort(function(a, b){return b.length - a.length;});

  for (i = 0; i < prefixes.length; i++)
  {
    if (item.substr(0, this.config.sharedPaths[prefixes[i]].length) == this.config.sharedPaths[prefixes[i]])
    {
      item = item.replace(this.config.sharedPaths[prefixes[i]], prefixes[i]);
      break;
    }
  }

  return item;
};

/**
 * Excludes includes of shared bundles from provided bundle
 *
 * @private
 * @param {object} options - options object for processed component
 */
Multibundle.prototype._excludeIncludes = function(options)
{
  // store reference to the sharedBundles includes and modules
  if (this.config.sharedBundles && this.config.sharedBundles.indexOf(options.name) > -1)
  {
    this.config.includedInShared = lodash.uniq((this.config.includedInShared || []).concat(options.include || []));
  }

  // add to exclude if paths is present in the component's path
  // and it's not present in the include list
  (this.config.includedInShared || []).forEach(function(m)
  {
    if (m in options.paths && options.include.indexOf(m) == -1)
    {
      options.exclude = (options.exclude || []).concat(m);
    }
  });

  // get shared list of paths + local per component paths take precedence
  options.paths = lodash.merge({}, this._modulesToEmptyPaths(lodash.difference(this.config.includedInShared || [], options.include || [])), options.paths || {});
};

/**
 * Converts list of modules into paths object filled with `empty:` path
 *
 * @private
 * @param   {array} modules - list of modules
 * @returns {object} paths object
 */
Multibundle.prototype._modulesToEmptyPaths = function(modules)
{
  var paths = {};

  (modules || []).forEach(function(m)
  {
    paths[m] = 'empty:';
  });

  return paths;
};

/**
 * Adds content based hash to the bundle files if needed,
 * and stores them on disk
 *
 * @private
 * @param {object} options - options object for processed component
 * @param {string} output - generated file (bundle) content
 * @param {function} callback - passes control when async operations are done
 */
Multibundle.prototype._handleOutput = function(options, output, callback)
{
  var hash;

  // if hashing is requested
  if (this.config.hashFiles)
  {
    // allow custom hashing functions
    if (typeof this.config.hashFiles == 'function')
    {
      hash = this.config.hashFiles(output, options);
    }
    else // use md5 by default
    {
      hash = crypto.createHash('md5').update(output).digest('hex');
    }

    // update filename
    options.outFile = options.outFile.replace(/\.js$/, '.' + hash + '.js');
  }

  // write files
  fs.writeFile(options.outFile, output, {encoding: 'utf8'}, function(err)
  {
    if (err)
    {
      callback(err);
      return;
    }

    console.log('- Created file "' + options.outFile + '"');

    callback();
  });
};

/**
 * Adds module with proper path to the component options.
 *
 * @private
 * @param {object} options - options object for processed component
 * @param {string} name - name of the module
 * @param {string} src - source property of the module config
 */
Multibundle.prototype._addModule = function(options, name, src)
{
  // compare notes with mapping
  src = this._expandItem(src);

  // skip if it's empty path
  if (src == 'empty:')
  {
    options.paths[name] = 'empty:';
  }
  else if (src.indexOf('node_modules/') > -1)
  {
    options.packages.push({
      name: name,
      location: path.dirname(src),
      main: path.basename(this._stripExtension(src))
    });
  }
  else
  {
    // paths should have resolved entries
    options.paths[name] = this._stripExtension(src);
  }
};

/**
 * Strips any extension from a filename
 *
 * @private
 * @param   {string} file - file path
 * @returns {string} - same but with stripped out extensions
 */
Multibundle.prototype._stripExtension = function(file)
{
  return path.join(path.dirname(file), path.basename(file, path.extname(file)));
};

/**
 * Implement _read to comply with Readable streams
 * Doesn't really make sense for flowing object mode
 *
 * @private
 */
Multibundle.prototype._read = function(){};
