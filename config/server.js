const winston = require('winston');

const app = require('./express').module();
const config = require('./config');

const protocol = require("http");

exports.initServer = function(next) {
  let server = app.listen(process.env.PORT || config.port, function () {
    let port = server.address().port;
    winston.info(`Express Server listening on port ${app.get('port')}`);
  });
}
