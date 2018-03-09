const express = require('express');
const config = require('./config');
const load = require('express-load');

exports.module = function() {
  let app = express();

  /* Sets the port to the one specfied on the config file */
  app.set('port', config.port);

  /* Allows for better routing - no need to keep adding new routers */
  load('models', {cwd:'app'})
    .then('controllers')
    .into(app);

  return app;
};
