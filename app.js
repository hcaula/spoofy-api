const async = require('async');

const initServer = require('./config/server').initServer;
const initMongoose = require('./config/database').initMongoose;

async.series([
  initMongoose,
  initServer
], function(error){
  if(error) console.log(error);
  else console.log("Initialization functions executed successfully.")
});

