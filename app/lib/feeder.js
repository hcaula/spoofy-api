const async = require('async');
const https = require('https');
const base64 = require('base-64');
const winston = require('winston');
const chromium = require('chromium');
const fs = require('fs');
const execFile = require('child_process').execFile;
const config = require('../../config/config');

const request = require('./requests').request;

const requestToken = function(next) {
    winston.info('Requesting token from Spotify.');
    let client_id = config.spotify.client_id;
    let client_secret = config.spotify.client_secret;
    let encoded = base64.encode(`${client_id}:${client_secret}`);

    let body = {
        'grant_type':'client_credentials'
    }

    let options = {
        host: 'accounts.spotify.com',
        path: '/api/token',
        method: 'POST',
        headers: {'Authorization': `Basic ${encoded}`}
    }

    request('https', options, body, function(error, response){
        if(error) next(error);
        else {
            winston.info("Token retrieved successfuly.")
            next(null, response.access_token);
        }
    });
}

const testToken = function(token, next) {
    winston.info('Testing token from Spotify.');

    let options = {
        host: 'api.spotify.com',
        path: '/v1/tracks/3n3Ppam7vgaVa1iaRUc9Lp',
        method: 'GET',
        headers: {'Authorization': `Bearer ${token}`}
    }

    request('https', options, function(error, response){
        if(error) next(error);
        else next(null, response);
    });
}

const printResponse = function(track, next) {
    console.log(track);
    next();
}

const requestAuthorization = function(next) {
    let client_id = config.spotify.client_id;
    let response_type = 'code';
    let redirect_uri = 'http://localhost:3000';

    let host = 'accounts.spotify.com';
    let path = `/authorize/?client_id=${client_id}&response_type=${response_type}&redirect_uri=${redirect_uri}&state=fromserver`

    let uri = `https://${host}${path}`;

    execFile(chromium.path, [uri], function(error) {
        if(error) next(error);
        else next();
    });
}
 
exports.authFlow = function(query, next) {
    let parsed = queryString.parse(query);
    next();
}

exports.initFeeder = function(next) {
    winston.info('Initiaiting feeder.');
    async.waterfall([
        requestAuthorization,
        writeHTMLFile,
        openChromium
    ], function(error){
        if(error) next(error);
        else next();
    });
}