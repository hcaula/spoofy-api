const winston = require('winston');

const app = require('./express').module();
const config = require('./config');

const protocol = require(config.protocol);

exports.initServer = function(next) {
  protocol.createServer(app).listen(app.get('port'),function(){
    winston.info(`Express Server listening on port ${app.get('port')}`);
    next();
  });
}
