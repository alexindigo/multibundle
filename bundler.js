var requirejs = require('requirejs');

process.on('message', function(data)
{
  var output;

  // pass "out" function call
  data.component.out = function(out)
  {
    output = out;
  };

  // pass control to r.js optimizer
  requirejs.optimize(data.component, function()
  {
    // it's done
    process.send({done: output});
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
