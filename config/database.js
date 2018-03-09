const winston = require('winston');
const mongoose = require('mongoose');
const config = require('./config');
const uri = config.mongodb.uri;

exports.initMongoose = function(next) {
  mongoose.connect(uri);

  mongoose.connection.on('connected', function() {
    winston.info(`Mongoose connected em ${uri}`);
    next();
  });

  mongoose.connection.on('disconnected', function() {
    winston.info(`Mongoose disconnected de ${uri}`);
  });

  mongoose.connection.on('error', function(error) {
    let err = new Error(`Error on connection: ${error}`);
    next(err);
  });

  process.on('SIGINT', function() {
    mongoose.connection.close(function() {
      winston.info('Mongoose disconnected by application exit.');
      process.exit(0);
    });
  });
}
