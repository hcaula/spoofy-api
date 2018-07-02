const querystring = require('querystring');

exports.request = function() {
    const protocol = require(arguments[0]);
    const options = arguments[1];
    let bodyStr, next;

    if(typeof arguments[2] == 'function') next = arguments[2];
    else {
        bodyStr = querystring.stringify(arguments[2]);
        next = arguments[3];
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = bodyStr.length;
    }

    const req = protocol.request(options, res => {
        let _chunk = '';

        res.on('data', chunk => {
            _chunk += chunk;
        });

        res.on('end', () => {
            try {
                const response = JSON.parse(_chunk);
                if(response.error) {
                    if(response.error.message) {
                        const error = new Error(response.error.message);
                        error.status = response.error.status;
                        next(error);
                    }
                    else next(_chunk);
                }
                else next(null, response);
            } catch(e) {
                next(e);
            }
        });

        res.on('error', error => {
            next(error);
        });
    });

    req.on('error', error => {
        next(error);
    });

    if(bodyStr) req.write(bodyStr);

    req.end();
}