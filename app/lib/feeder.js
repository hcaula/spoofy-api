const async = require('async');
const https = require('https');
const base64 = require('base-64');
const winston = require('winston');
const chromium = require('chromium');
const fs = require('fs');
const execFile = require('child_process').execFile;
const config = require('../../config/config');

const request = require('./requests').request;

let _code;

const requestAuthorization = function() {
    let client_id = config.spotify.client_id;
    let response_type = 'code';
    let redirect_uri = 'http://localhost:3000/callback';
    let scope = 'user-read-recently-played'

    let host = 'accounts.spotify.com';
    let path = `/authorize/?client_id=${client_id}&response_type=${response_type}&redirect_uri=${redirect_uri}&scope=${scope}`;

    let uri = `https://${host}${path}`;

    execFile(chromium.path, [uri], function(error) {
        if(error) winston.error(error);
        else winston.info('Chromimum aberto');
    });
}

const requestRefreshToken = function(next) {
    let client_id = config.spotify.client_id;
    let client_secret = config.spotify.client_secret;
    let encoded = base64.encode(`${client_id}:${client_secret}`);

    let body = {
        'grant_type':'authorization_code',
        'code': _code,
        'redirect_uri': 'http://localhost:3000/callback'
    }

    let options = {
        host: 'accounts.spotify.com',
        path: '/api/token',
        method: 'POST',
        headers: {'Authorization': `Basic ${encoded}`}
    }

    request('https', options, body, function(error, response){
        if(error) next(error);
        else next(null, response);
    });
}

const testToken = function(response, next) {
    let type = 'track';
    let limit = 50;
    let after = 1484811043508;

    let query = `?type=${type}&limit=${limit}&after=${after}`;

    let options = {
        callee: true,
        host: 'api.spotify.com',
        path: `/v1/me/player/recently-played${query}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${response.access_token}`,
            'Accept': 'application/json'
        }
    }

    request('https', options, function(error, response){
        if(error) next(error);
        else {
            console.log(response);
            next();
        }
    });
}
 
exports.authFlow = function(query, next) {
    if(query.error) {
        winston.error(query.error);
        query.error.status = 401;
        next(query.error);
    } else {
        _code = query.code;
        async.waterfall([
            requestRefreshToken,
            testToken
        ], function(error){
            if(error) next(error);
            else next();
        });
    }
    
}

exports.initFeeder = function(next) {
    requestAuthorization();
    next();
}