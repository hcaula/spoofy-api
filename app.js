const async = require('async');
const winston = require('winston');
const config = require('./config/config');

const { initServer } = require('./config/server');
const { initMongoose } = require('./config/database');
const { configWinston } = require('./config/winston');

process.on('uncaughtException', err => {
    console.log('Caught exception: ', err);
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

async.series([
    configWinston,
    initMongoose,
    initServer
], error => {
    if (error) winston.error(error.stack);
    else {
        const port = process.env.PORT;
        winston.info(`Server is ready to receive API calls on ` + 
        `${config.protocol}://${config.hostname}${port ? `:${port}` : ''}`);
    }
});
