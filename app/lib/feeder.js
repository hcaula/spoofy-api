const async = require('async');
const https = require('https');
const base64 = require('base-64');
const winston = require('winston');
const querystring = require('querystring');
const config = require('../../config/config');

const requestToken = function(next) {
    winston.info('Requesting token from Spotify.');
    const client_id = config.spotify.client_id;
    const client_secret = config.spotify.client_secret;
    const encoded = base64.encode(`${client_id}:${client_secret}`);

    const body = {
        'grant_type':'client_credentials'
    }

    let bodyStr = querystring.stringify(body);

    let options = {
        host: 'accounts.spotify.com',
        path: '/api/token',
        method: 'POST',
        headers: { 
            'Authorization': `Basic ${encoded}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': bodyStr.length
        }
    };

    let req = https.request(options, function(res){
        let _chunk = '';

        res.on('data', function(chunk){
            _chunk += chunk;
        });

        res.on('end', function(){
            let response = JSON.parse(_chunk);
            let token = response.access_token;
            next(null, token);
        });

        res.on('error', function(error){
            next(error);
        });
    });

    req.on('error', function(error){
        next(error);
    });

    req.write(bodyStr);

    req.end();
}

const testToken = function(token, next) {
    winston.info('Testing token from Spotify.');

    let options = {
        host: 'api.spotify.com',
        path: '/v1/tracks/3n3Ppam7vgaVa1iaRUc9Lp',
        method: 'GET',
        headers: {'Authorization': `Bearer ${token}`}
    }

    let req = https.request(options, function(res){
        let _chunk = '';

        res.on('data', function(chunk){
            _chunk += chunk;
        });

        res.on('end', function(){
            let response = JSON.parse(_chunk);
            next(null, response);
        });

        res.on('error', function(error){
            next(error);
        });
    });

    req.on('error', function(error){
        next(error);
    });

    req.end();
}

const printResponse = function(track, next) {
    console.log(track);
    next();
}

exports.initFeeder = function(next) {
    winston.info('Initiaiting feeder.');
    async.waterfall([
        requestToken,
        testToken,
        printResponse
    ], function(error){
        if(error) next(error);
        else next();
    });
}