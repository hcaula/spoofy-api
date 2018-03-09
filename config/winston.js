const winston = require('winston');

function addZero(i) {
  if (i < 10) i = "0" + i;
  return i;
}

exports.configWinston = function(next) {
  const winstonConfig = winston.config;

  const colors = {
    info: 'green',
    error: 'red',
    warn: 'yellow'
  }

  let custom = {
    transports: [
      new (winston.transports.Console)({
        timestamp: function() {
          return Date.now();
        },
        formatter: function(options) {
          let d = new Date();
          let h = addZero(d.getHours());
          let m = addZero(d.getMinutes());
          let s = addZero(d.getSeconds());

          let date = " @ " + h + ":" + m + ":" + s;

          return winstonConfig.colorize(options.level, options.level.toUpperCase()) +
          winstonConfig.colorize(options.level, date) + ': ' +
            (options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
        }
      })
    ]
  }

  winston.addColors(colors);
  winston.configure(custom);
  winston.log('info', 'Winston configurado com sucesso.');
  next();
}
