var requirejs = require('requirejs');

process.on('message', function(data)
{
  // pass "out" function call
  data.component.out = function()
  {
    process.send({out: Array.prototype.slice.call(arguments)});
  };

  // pass control to r.js optimizer
  requirejs.optimize(data.component, function()
  {
    // it's done
    process.send({done: data.component.name});
    process.exit();
  },
  // error happened
  function(err)
  {
    // report upstream
    process.send({err: err});
    process.exit(1);
  });

  process.send({started: data.component.name});
});
