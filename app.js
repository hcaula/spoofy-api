const async = require('async');
const winston = require('winston');

const initServer = require('./config/server').initServer;
const initMongoose = require('./config/database').initMongoose;
const initFeeder = require('./app/lib/feeder').initFeeder;
const configWinston = require('./config/winston').configWinston;

async.series([
  configWinston,
  initMongoose,
  initServer,
  initFeeder
], function(error){
  if(error) winston.error(error);
  else winston.info("Initialization functions executed successfully.")
});

