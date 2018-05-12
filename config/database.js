const winston = require('winston');
const mongoose = require('mongoose');
const config = require('./config');

exports.initMongoose = function (next) {
    const uri = (process.env.MONGODB_URI || config.mongodb.uri);

    mongoose.connect(uri);

    mongoose.connection.on('connected', () => {
        winston.info(`Mongoose connected em ${uri}`);
        next();
    });

    mongoose.connection.on('disconnected', () => {
        winston.info(`Mongoose disconnected de ${uri}`);
    });

    mongoose.connection.on('error', error => {
        const err = new Error(`Error on connection: ${error}`);
        next(err);
    });

    process.on('SIGINT', function () {
        mongoose.connection.close(() => {
            winston.info('Mongoose disconnected by application exit.');
            process.exit(0);
        });
    });
}
