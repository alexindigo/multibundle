var requirejs = require('requirejs');

process.on('message', function(data)
{
  var output;
  var stdout = '';

  var unhook = hookStdout(function(chunk)
  {
    stdout += chunk.toString();
  });

  // pass "out" function call
  data.component.out = function(out)
  {
    output = out;
  };

  // pass control to r.js optimizer
  requirejs.optimize(data.component, function()
  {
    // it's done
    unhook();
    process.send({done: output, stdout: stdout});
    process.exit();
  },
  // error happened
  function(err)
  {
    // report upstream
    unhook();
    process.send({err: err, stdout: stdout});
    process.exit(1);
  });

  process.send({started: data.component.name});
});

/**
 * Hooks into stdout stream
 * to snitch on passed data
 *
 * @param   {function} callback - invoked on each passing chunk
 * @returns {function} - snitching-cancel function
 */
function hookStdout(callback)
{
  process.stdout._oWrite = process.stdout.write;

  // take control
  process.stdout.write = function(string, encoding, fd)
  {
    callback(string, encoding, fd);
  };

  // reverse it
  return function()
  {
    process.stdout.write = process.stdout._oWrite;
  };
}
