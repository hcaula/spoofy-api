const express = require('express');
const config = require('./config');
const load = require('express-load');
const bodyParser = require('body-parser');

exports.module = function() {
  let app = express();

  // app.use(express.static('./public'));
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());

  /* Sets the port to the one specfied on the config file */
  app.set('port', config.port);

  /* Allows for better routing - no need to keep adding new routers */
  load('models', {cwd:'app'})
    .then('controllers')
    .into(app);

  return app;
};
