const express = require('express');
const config = require('./config');
const load = require('express-load');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

exports.module = function() {
  let app = express();

  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());
  app.use(cors());

  /* Sets the port to the one specfied on the config file */
  let port = (process.env.PORT || config.port)
  app.set('port', port);

  /* Allows for better routing - no need to keep adding new routers */
  load('models', {cwd:'app'})
    .then('controllers')
    .into(app);

  return app;
};
