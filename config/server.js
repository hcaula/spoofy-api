const winston = require('winston');

const app = require('./express').module();
const config = require('./config');

const protocol = require("http");

exports.initServer = function (next) {
    const server = app.listen(process.env.PORT || app.get('port'), () => {
        const port = server.address().port;
        winston.info(`Express Server configured successfully on port ${port}.`);
        next();
    });
}
