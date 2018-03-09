const mongoose = require('mongoose');
const config = require('./config');
const uri = config.mongodb.uri;

exports.initMongoose = function(next) {
  mongoose.connect(uri);

  mongoose.connection.on('connected', function() {
    console.log(`Mongoose connected em ${uri}`);
    next();
  });

  mongoose.connection.on('disconnected', function() {
    console.log(`Mongoose disconnected de ${uri}`);
  });

  mongoose.connection.on('error', function(error) {
    let err = new Error(`Error on connection: ${error}`);
    next(err);
  });

  process.on('SIGINT', function() {
    mongoose.connection.close(function() {
      console.log('Mongoose disconnected by application exit.');
      process.exit(0);
    });
  });
}
