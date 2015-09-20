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
  logLevel: 1
};

/**
 * Parses multibundle config and transforms it into requirejs compatible options.
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
      console.log('-- All requirejs bundles have been processed.');
    }

    // singal end of the stream
    this.push(null);
  }.bind(this));
}

/**
 * Creates list of components to process with shared bundles being first in the list
 *
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
 */
Multibundle.prototype._processComponent = function(component)
{
  var options =
  {
    cjsTranslate           : true,
    create                 : true,
    removeCombined         : true,
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
  };

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

  console.log('\n\n ++++++ OPTIONS ----- ', options.name, ' ---- ', options);

  return this._asyncOptimize.bind(this, options);
}

/**
 * Forks child process to execute r.js with provided options
 *
 * @private
 * @param   {object} options - r.js options for the component
 * @param   {function} callback - invoked when child process finished
 * @returns {[type]} [description]
 */
Multibundle.prototype._asyncOptimize = function(options, callback)
{
  var bundler = child.fork(bundlerPath, [], {cwd: process.cwd()});

  // pass component options
  bundler.send({component: options});

  // wait for response
  bundler.on('message', function(msg)
  {
    // pass error to upstream
    if (msg.err)
    {
      callback(err);
      return;
    }

    // pass data to the component.out handler
    if (msg.out)
    {
      options.out.apply(this, msg.out);
      return;
    }

    // pass control back to upstream
    if (msg.done)
    {
      // silent is number 4 in r.js world
      if (this.config.logLevel < 4)
      {
        console.log('Finished "' + options.name + '" bundle.');
      }

      callback(null, msg.done);
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
    , baseCwd = path.resolve(process.cwd(), this.config.baseUrl);

  // we can have either a string or an object
  if (typeof item == 'string')
  {
    // add item to the config
    // if item has glob patterns - unfold it
    if (glob.hasMagic(item))
    {
      item = this._expandItem(item);

      // unfold path and add to include list
      options.include = options.include.concat(
        glob.sync(item, {cwd: baseCwd, ignore: this.config.includedInShared.map(this._expandItem.bind(this, '.js'))})
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

  for (i=0; i<prefixes.length; i++)
  {
    if (item.substr(0, prefixes[i].length) == prefixes[i])
    {
      item = item.replace(prefixes[i], this.config.sharedPaths[prefixes[i]]);
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

  for (i=0; i<prefixes.length; i++)
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

    // combine modules and paths of the shared modules
    this.config.modulesOfShared = lodash.uniq((this.config.modulesOfShared || []).concat(options.packages || []), 'name');
    this.config.sharedPaths = lodash.merge({}, this.config.sharedPaths || {}, options.paths || {});
  }

  // preserve existing packages
  // based on `name` property of the package
  options.packages = lodash.uniq((this.config.modulesOfShared || []).concat(options.packages || []), 'name');
  // get shared list of paths + local per component paths take precedence
  options.paths = lodash.merge({}, this.config.sharedPaths || {}, options.paths || {});

  // don't exclude explicitly listed
  options.exclude = lodash.difference(this.config.includedInShared || [], options.include || []);
};

/**
 * Adds content based hash to the bundle files if needed,
 * and stores them on disk
 *
 * @private
 * @param {object} options - options object for processed component
 * @param {string} output - generated file (bundle) content
 */
Multibundle.prototype._handleOutput = function(options, output)
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
      this.emit('error', err);
      return;
    }

    console.log('- Created file "' + options.outFile + '"');

    // update mapping
    // TODO: just pass componentOptions
    this.push(options);
  }.bind(this));
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
  if (src.indexOf('node_modules/') > -1)
  {
    options.packages.push(
    {
      name: name,
      location: path.dirname(src),
      main: path.basename(this._stripExtension(src))
    });
  }
  else
  {
    // paths should have resolved entries
    options.paths[name] = this._expandItem(this._stripExtension(src));
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
