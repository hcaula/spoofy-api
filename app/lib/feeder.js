const async = require('async');
const https = require('https');
const base64 = require('base-64');
const winston = require('winston');
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