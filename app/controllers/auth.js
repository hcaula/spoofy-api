/*
 * Modules
*/
const express = require('express');
const app = express();
const async = require('async');
const config = require('../../config/config');
const base64 = require('base-64');
const winston = require('winston');

const User = require('mongoose').model('User');

const errors = require('../lib/errors').errors;
const request = require('../lib/requests').request;
const initJob = require('../lib/jobs').initJob;

module.exports = function(app) {
    app.get('/v1/auth', requestUserAuthorization);
    app.get('/v1/callback', requestAccessToken, requestUserData, loginOrRegister);
}

let requestUserAuthorization = function(req, res) {
    let client_id = (process.env.SPOTIFY_CLIENTID || config.spotify.client_id);
    let response_type = 'code';
    let redirect_uri = (process.env.SPOTIFY_REDIRECTURI || config.spotify.redirect_uri);
    let scope = 'user-read-recently-played user-read-email user-read-private'
    
    let host = 'accounts.spotify.com';
    let path = '/authorize/?';
    path += `client_id=${client_id}&`;
    path += `response_type=${response_type}&`;
    path += `redirect_uri=${redirect_uri}&`;
    path += `scope=${scope}&`;
    path += `show_dialog=${true}`;
    
    let uri = `https://${host}${path}`;
    
    res.redirect(uri);
}

let requestAccessToken = function(req, res, next) {
    if(req.query.error) {
        winston.error(req.query.error);
        res.status(500).json(errors[500]);
    } else {
        let code = req.query.code;
        let client_id = (process.env.SPOTIFY_CLIENTID || config.spotify.client_id);
        let client_secret = (process.env.SPOTIFY_CLIENTSECRET|| config.spotify.client_secret);
        let encoded = base64.encode(`${client_id}:${client_secret}`);
        let redirect_uri = (process.env.SPOTIFY_REDIRECTURI || config.spotify.redirect_uri);

        let body = {
            'grant_type':'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri
        }

        let options = {
            host: 'accounts.spotify.com',
            path: '/api/token',
            method: 'POST',
            headers: {'Authorization': `Basic ${encoded}`}
        }

        request('https', options, body, function(error, response){
            if(error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else {
                req.token = response;
                next();
            }
        });
    }
}

let requestUserData = function(req, res, next) {
    let access_token = req.token.access_token;
    let options = {
        host: 'api.spotify.com',
        path: '/v1/me',
        method: 'GET',
        headers: {'Authorization': `Bearer ${access_token}`}
    }

    request('https', options, function(error, response){
        if(error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            req.user = {
                _id: response.id,
                display_name: (response.display_name || response.id),
                email: response.email,
                uri: response.uri,
                href: response.href,
                images: response.images,
                token: req.token
            }
            next();
        }
    });
}

let loginOrRegister = function(req, res, next) {
    User.findById(req.user._id, function(error, user){
        if(error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else if (user) {
            user.token = req.token;
            user.save(function(error){
                if(error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    res.status(200).json({
                        message: "We're so glad you're already registered with us. Thank you.",
                        access_token: user.token.access_token
                    });
                }
            });
        } else {
            user = new User(req.user);
            user.save(function(error){
                if(error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    winston.info(`A new user has been registered.\nDisplay name: ${user.display_name}\n_id: ${user._id}`);
                    res.status(200).json({
                        message: "User has been created successfully, redirect to dashboard page now.",
                        access_token: user.token.access_token
                    });
                }
            });
        }
    });
}