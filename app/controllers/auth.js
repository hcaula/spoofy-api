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
const Session = require('mongoose').model('Session');

const errors = require('../lib/errors');
const util = require('../lib/util');
const request = require('../lib/requests').request;
const initJob = require('../lib/jobs').initJob;

module.exports = function(app) {
    app.get('/v1/auth', requestUserAuthorization);
    app.get('/v1/callback', requestAccessToken, requestUserData, loginOrRegister, startSession);
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
            req.user = user;
            user.token = req.token;
            user.save(function(error){
                if(error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else next();
            });
        } else {
            user = new User(req.user);
            user.save(function(error){
                if(error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    winston.info(`A new user has been registered.\nDisplay name: ${user.display_name}\n_id: ${user._id}`);
                    next();
                }
            });
        }
    });
}

let startSession = function(req, res, next) {
    let user = req.user;
    let token = req.token;
    let next_week = util.calculateNextWeek();

    let current_session;

    Session.findOne({user: user._id}, function(error, session){
        if(error) {
            winston.error(error.stack);
            res.status(500).send(errors[500]);
        } else if (!session) {
            let new_session = new Session({
                user: user._id,
                token: token.access_token,
                expiration_date: next_week
            });

            current_session = new_session;
        } else {
            current_session = session;
            current_session.expiration_date = next_week;
        }

        current_session.save(function(error){
            if(error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else {
                res.cookie('spoofy', token.access_token, {expires: next_week, httpOnly: true, signed: true})
                res.redirect('/dashboard');
            }
        });
    });
}