<a name="module_Multibundle"></a>
## Multibundle
Runs requirejs bundling on multiple bundles in parallel.

[![Build Status](https://travis-ci.org/alexindigo/multibundle.svg)](https://travis-ci.org/alexindigo/multibundle)

**Example**  
```js
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

* [Multibundle](#module_Multibundle)
  * [Multibundle](#exp_module_Multibundle--Multibundle) ⏏
    * [`new Multibundle(config, components)`](#new_module_Multibundle--Multibundle_new)
    * [`._getComponents()`](#module_Multibundle--Multibundle+_getComponents) ⇒ <code>array</code> ℗
    * [`._processComponent(component)`](#module_Multibundle--Multibundle+_processComponent) ⇒ <code>object</code> ℗
    * [`._prepareForRjs(options)`](#module_Multibundle--Multibundle+_prepareForRjs) ⇒ <code>function</code> ℗
    * [`._asyncOptimize(options, callback)`](#module_Multibundle--Multibundle+_asyncOptimize) ℗
    * [`._processItem(options, item)`](#module_Multibundle--Multibundle+_processItem) ℗
    * [`._expandItem([ext], item)`](#module_Multibundle--Multibundle+_expandItem) ⇒ <code>string</code> ℗
    * [`._abridgeItem(item)`](#module_Multibundle--Multibundle+_abridgeItem) ⇒ <code>string</code> ℗
    * [`._excludeIncludes(options)`](#module_Multibundle--Multibundle+_excludeIncludes) ℗
    * [`._modulesToEmptyPaths(modules)`](#module_Multibundle--Multibundle+_modulesToEmptyPaths) ⇒ <code>object</code> ℗
    * [`._handleOutput(options, output, callback)`](#module_Multibundle--Multibundle+_handleOutput) ℗
    * [`._addModule(options, name, src)`](#module_Multibundle--Multibundle+_addModule) ℗
    * [`._stripExtension(file)`](#module_Multibundle--Multibundle+_stripExtension) ⇒ <code>string</code> ℗
    * [`._read()`](#module_Multibundle--Multibundle+_read) ℗


-

<a name="exp_module_Multibundle--Multibundle"></a>
### Multibundle ⏏
**Kind**: Exported class  

-

<a name="new_module_Multibundle--Multibundle_new"></a>
#### `new Multibundle(config, components)`
Parses multibundle config and transforms it into requirejs compatible options.

**Params**
- config <code>object</code> - process configuration object
- components <code>array</code> - list of bundles to build


-

<a name="module_Multibundle--Multibundle+_getComponents"></a>
#### `multibundle._getComponents()` ⇒ <code>array</code> ℗
Creates list of components to process with shared bundles being first in the list

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Returns**: <code>array</code> - list of component handles  
**Access:** private  

-

<a name="module_Multibundle--Multibundle+_processComponent"></a>
#### `multibundle._processComponent(component)` ⇒ <code>object</code> ℗
Assembles r.js options for the component

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Returns**: <code>object</code> - r.js ready bundling options hash  
**Access:** private  
**Params**
- component <code>string</code> - component name to process


-

<a name="module_Multibundle--Multibundle+_prepareForRjs"></a>
#### `multibundle._prepareForRjs(options)` ⇒ <code>function</code> ℗
Converts options object into async.parallel ready function
to process component with r.js

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Returns**: <code>function</code> - async.parallel ready function  
**Access:** private  
**Params**
- options <code>object</code> - r.js options for the component


-

<a name="module_Multibundle--Multibundle+_asyncOptimize"></a>
#### `multibundle._asyncOptimize(options, callback)` ℗
Forks child process to execute r.js with provided options

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Access:** private  
**Params**
- options <code>object</code> - r.js options for the component
- callback <code>function</code> - invoked when child process finished


-

<a name="module_Multibundle--Multibundle+_processItem"></a>
#### `multibundle._processItem(options, item)` ℗
Converts component item into proper r.js component options

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Access:** private  
**Params**
- options <code>object</code> - r.js options for the component
- item <code>object</code> | <code>string</code> - item to bundle with the component


-

<a name="module_Multibundle--Multibundle+_expandItem"></a>
#### `multibundle._expandItem([ext], item)` ⇒ <code>string</code> ℗
Expands provided glob pattern with path from mapping hash

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Returns**: <code>string</code> - resulted path  
**Access:** private  
**Params**
- [ext] <code>string</code> - extension to add to the item
- item <code>string</code> - item to bundle with the component


-

<a name="module_Multibundle--Multibundle+_abridgeItem"></a>
#### `multibundle._abridgeItem(item)` ⇒ <code>string</code> ℗
Undoes expansion of provided item with path from mapping hash

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Returns**: <code>string</code> - resulted path  
**Access:** private  
**Params**
- item <code>string</code> - item to bundle with the component


-

<a name="module_Multibundle--Multibundle+_excludeIncludes"></a>
#### `multibundle._excludeIncludes(options)` ℗
Excludes includes of shared bundles from provided bundle

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Access:** private  
**Params**
- options <code>object</code> - options object for processed component


-

<a name="module_Multibundle--Multibundle+_modulesToEmptyPaths"></a>
#### `multibundle._modulesToEmptyPaths(modules)` ⇒ <code>object</code> ℗
Converts list of modules into paths object filled with `empty:` path

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Returns**: <code>object</code> - paths object  
**Access:** private  
**Params**
- modules <code>array</code> - list of modules


-

<a name="module_Multibundle--Multibundle+_handleOutput"></a>
#### `multibundle._handleOutput(options, output, callback)` ℗
Adds content based hash to the bundle files if needed,
and stores them on disk

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Access:** private  
**Params**
- options <code>object</code> - options object for processed component
- output <code>string</code> - generated file (bundle) content
- callback <code>function</code> - passes control when async operations are done


-

<a name="module_Multibundle--Multibundle+_addModule"></a>
#### `multibundle._addModule(options, name, src)` ℗
Adds module with proper path to the component options.

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Access:** private  
**Params**
- options <code>object</code> - options object for processed component
- name <code>string</code> - name of the module
- src <code>string</code> - source property of the module config


-

<a name="module_Multibundle--Multibundle+_stripExtension"></a>
#### `multibundle._stripExtension(file)` ⇒ <code>string</code> ℗
Strips any extension from a filename

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Returns**: <code>string</code> - - same but with stripped out extensions  
**Access:** private  
**Params**
- file <code>string</code> - file path


-

<a name="module_Multibundle--Multibundle+_read"></a>
#### `multibundle._read()` ℗
Implement _read to comply with Readable streams
Doesn't really make sense for flowing object mode

**Kind**: instance method of <code>[Multibundle](#exp_module_Multibundle--Multibundle)</code>  
**Access:** private  

-

