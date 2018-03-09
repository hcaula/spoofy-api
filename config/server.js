const config = require('./config');
const express = require('express');
const app = express();

const port = config.port;

exports.initServer = function(next){
    app.listen(port, function () {
        console.log(`Express app listening on port ${port}.`);
    });
}