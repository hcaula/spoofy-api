const querystring = require('querystring');

exports.request = function() {
    const protocol = require(arguments[0]);
    let options = arguments[1];
    let bodyStr, next;

    if(typeof arguments[2] == 'function') next = arguments[2];
    else {
        bodyStr = querystring.stringify(arguments[2]);
        next = arguments[3];
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = bodyStr.length;
    }

    let req = protocol.request(options, function(res){
        let _chunk = '';

        res.on('data', function(chunk){
            _chunk += chunk;
            if(options.callee) console.log(chunk);
        });

        res.on('end', function(){
            try {
                let response = JSON.parse(_chunk);
                next(null, response);
            } catch(e) {
                next(e);
            }
        });

        res.on('error', function(error){
            next(error);
        });
    });

    req.on('error', function(error){
        next(error);
    });

    if(bodyStr) req.write(bodyStr);

    req.end();
}