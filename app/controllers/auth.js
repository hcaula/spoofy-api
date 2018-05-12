/*
 * Modules
*/
const express = require('express');
const app = express();
const config = require('../../config/config');
const { encode } = require('base-64');
const winston = require('winston');

const User = require('mongoose').model('User');
const Session = require('mongoose').model('Session');

const errors = require('../lib/errors');
const { calculateNextWeek } = require('../lib/util');
const { request } = require('../lib/requests');
const { initJob } = require('../lib/jobs');

module.exports = function (app) {
    app.get('/api/v1/callback', requestAccessToken, requestUserData, loginOrRegister, startSession);
}

const requestAccessToken = function (req, res, next) {
    if (req.query.error) {
        winston.error(req.query.error);
        res.status(500).json(errors[500]);
    } else {
        const code = req.query.code;
        const client_id = (process.env.SPOTIFY_CLIENTID || config.spotify.client_id);
        const client_secret = (process.env.SPOTIFY_CLIENTSECRET || config.spotify.client_secret);
        const encoded = encode(`${client_id}:${client_secret}`);
        const redirect_uri = (process.env.SPOTIFY_REDIRECTURI || config.spotify.redirect_uri);

        const body = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri
        }

        const options = {
            host: 'accounts.spotify.com',
            path: '/api/token',
            method: 'POST',
            headers: { 'Authorization': `Basic ${encoded}` }
        }

        request('https', options, body, (error, response) => {
            if (error) {
                winston.error(new Error(error).stack);
                res.status(500).json(errors[500]);
            } else {
                req.token = response;
                next();
            }
        });
    }
}

const requestUserData = function (req, res, next) {
    const access_token = req.token.access_token;
    const options = {
        host: 'api.spotify.com',
        path: '/v1/me',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${access_token}` }
    }

    request('https', options, (error, response) => {
        if (error) {
            winston.error(new Error(error).stack);
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

const loginOrRegister = function (req, res, next) {
    User.findById(req.user._id, (error, user) => {
        if (error) {
            winston.error(new Error(error).stack);
            res.status(500).json(errors[500]);
        } else if (user) {
            req.user = user;
            user.token = req.token;
            user.save(error => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else next();
            });
        } else {
            user = new User(req.user);
            user.save((error, u) => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    req.user = u;
                    winston.info(`A new user has been registered.\nDisplay name: ${user.display_name}\n_id: ${user._id}`);
                    winston.info('Starting job for new user.');
                    initJob([u], error => {
                        if(error) {
                            winston.error(error.stack);
                            res.status(500).json(errors[500]);
                        } else next();
                    });
                }
            });
        }
    });
}

const startSession = function (req, res, next) {
    const user = req.user;
    const token = req.token;
    const next_week = calculateNextWeek();

    let current_session;

    Session.findOne({ user: user._id }, (error, session) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).send(errors[500]);
        } else if (!session) {
            current_session = new Session({
                user: user._id,
                token: token.access_token,
                expiration_date: next_week
            });
        } else {
            current_session = session;
            current_session.token = token.access_token;
            current_session.expiration_date = next_week;
        }

        current_session.save(error => {
            if (error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else res.redirect((process.env.CLIENT_URL || config.client.url) + '?token=' + token.access_token);
        });
    });
}