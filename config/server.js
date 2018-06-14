const winston = require('winston');

const app = require('./express').module();

exports.initServer = function (next) {
    app.listen(process.env.PORT, () => {
        winston.info('Express Server configured successfully.');
        next();
    });
}
