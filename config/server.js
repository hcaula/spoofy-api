const winston = require('winston');

const app = require('./express').module();
const config = require('./config');

exports.initServer = function (next) {
    app.listen(process.env.PORT || config.port, () => {
        winston.info('Express Server configured successfully.');
        next();
    });
}
