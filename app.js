const async = require('async');
const winston = require('winston');
const config = require('./config/config');

const initServer = require('./config/server').initServer;
const initMongoose = require('./config/database').initMongoose;
const configWinston = require('./config/winston').configWinston;

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ', err);
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

async.series([
  configWinston,
  initMongoose,
  initServer
], function(error){
  if(error) winston.error(error);
  else {
    winston.info(`Server is ready to receive API calls on ${config.protocol}://${config.hostname}:${config.port}`);
  }
});
