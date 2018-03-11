/*
 * Modules
*/
const express = require('express');
const app = express();
const async = require('async');
const config = require('../../config/config');

module.exports = function(app) {

    app.get('/auth', function(req, res){
        let client_id = (process.env.SPOTIFY_CLIENTID || config.spotify.client_id);
        let response_type = 'code';
        let redirect_uri = 'http://localhost:3000/callback';
        let scope = 'user-read-recently-played user-read-email user-read-private'

        let host = 'accounts.spotify.com';
        let path = '/authorize/?';
        path += `client_id=${client_id}&`;
        path += `response_type=${response_type}&`;
        path += `redirect_uri=${redirect_uri}&`;
        path += `scope=${scope}`;

        let uri = `https://${host}${path}`;

        res.redirect(uri);
    });
}