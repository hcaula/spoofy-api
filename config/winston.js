const winston = require('winston');

function addZero(i) {
    if (i < 10) i = "0" + i;
    return i;
}

exports.configWinston = function (next) {
    const winstonConfig = winston.config;

    const colors = {
        info: 'green',
        error: 'red',
        warn: 'yellow'
    }

    const custom = {
        transports: [
            new (winston.transports.Console)({
                timestamp: function () {
                    return Date.now();
                },
                formatter: function (options) {
                    const d = new Date();
                    const h = addZero(d.getHours());
                    const m = addZero(d.getMinutes());
                    const s = addZero(d.getSeconds());

                    const date = " @ " + h + ":" + m + ":" + s;

                    return winstonConfig.colorize(options.level, options.level.toUpperCase()) +
                        winstonConfig.colorize(options.level, date) + ': ' +
                        (options.message ? options.message : '') +
                        (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
                }
            })
        ]
    }

    winston.addColors(colors);
    winston.configure(custom);
    winston.log('info', 'Winston log library configured successfully.');
    next();
}
