const async = require('async');
const winston = require('winston');

const initServer = require('./config/server').initServer;
const initMongoose = require('./config/database').initMongoose;
const configWinston = require('./config/winston').configWinston;

async.series([
  configWinston,
  initMongoose,
  initServer
], function(error){
  if(error) winston.error(error);
  else winston.info("Initialization functions executed successfully.")
});

