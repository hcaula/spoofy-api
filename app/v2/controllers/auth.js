/*
 * Modules
*/
const { encode } = require('base-64');
const winston = require('winston');

const User = require('mongoose').model('User');
const Session = require('mongoose').model('Session');

const errors = require('../lib/errors');
const { calculateNextWeek, calculateExpirationDate } = require('../lib/util');
const { request } = require('../lib/requests');

module.exports = function (app) {
    app.get('/api/v2/callback', requestAccessToken, requestUserData, loginOrRegister, startSession);
    app.post('/api/v2/token/refresh', refreshToken);
}

const requestAccessToken = function (req, res, next) {
    if (req.query.error) {
        winston.error(req.query.error);
        res.status(500).json(errors[500]);
    } else {
        const code = req.query.code;
        const client_id = process.env.SPOTIFY_CLIENTID;
        const client_secret = process.env.SPOTIFY_CLIENTSECRET;
        const encoded = encode(`${client_id}:${client_secret}`);
        const redirect_uri = process.env.SPOTIFY_REDIRECTURI;

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
                    req.isNew = true;
                    winston.info(`A new user has been registered.\nDisplay name: ${user.display_name}\n_id: ${user._id}`);
                    next();
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
            } else res.redirect(process.env.CLIENT_URL + `?token=${token.access_token}&new=${req.isNew}`);
        });
    });
}

/* Request new token using the refresh token */
const refreshToken = function (req, res) {
    const refresh_token = req.body.refresh_token;
    const user = req.body.user;

    if (!refresh_token) res.status(400).json(errors[400]('refresh_token'));
    else if (!user) res.status(400).json(errors[400]('user'));
    else {
        User.findOne({"token.refresh_token": refresh_token }, (error, user) => {
            if (error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else if (!user) {
                res.status(404).json({
                    error: "No user with this refresh token and id has been found.",
                    type: "user_refresh_token_not_found"
                });
            } else {
                const client_id = process.env.SPOTIFY_CLIENTID;
                const client_secret = process.env.SPOTIFY_CLIENTSECRET;
                const encoded = encode(`${client_id}:${client_secret}`);

                const body = {
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token
                }

                const options = {
                    host: 'accounts.spotify.com',
                    path: '/api/token',
                    method: 'POST',
                    headers: { 'Authorization': `Basic ${encoded}` }
                }

                request('https', options, body, (error, response) => {
                    if (error) {
                        const err = new Error(error);
                        winston.error(err.stack);
                        res.status(500).json(errors[500]);
                    } else {
                        let token = user.token;
                        token.access_token = response.access_token;
                        user.token = token;
                        user.save((error, user) => {
                            if (error) {
                                winston.error(error.stack);
                                res.status(500).json(errors[500]);
                            } else {
                                Session.findOne({ user: user._id }, (error, session) => {
                                    if (error) {
                                        winston.error(error.stack);
                                        res.status(500).json(errors[500]);
                                    } else {
                                        session.token = user.token.access_token;
                                        session.expiration_date = calculateNextWeek();

                                        session.save(error => {
                                            if (error) {
                                                winston.error(error.stack);
                                                res.status(500).json(errors[500]);
                                            } else {
                                                res.status(200).json({
                                                    message: "Token has been refreshed successfully.",
                                                    token: session.token
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }
}